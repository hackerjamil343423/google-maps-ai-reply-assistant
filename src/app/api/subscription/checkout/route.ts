import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import {
  createSession,
  createSubscription,
  cancelSubscription,
  isGeideaCustomerNotFoundError,
  isGeideaDuplicateCustomerError,
  isGeideaSubscriptionNotEnabledError,
} from "@/lib/geidea/client";
import type { GeideaSubscription } from "@/lib/geidea/types";
import { getEffectivePlanGeideaConfig } from "@/lib/subscription/pricing";
import { ensureWorkspaceForUser } from "@/lib/workspace";

const checkoutSchema = z.object({
  plan: z.enum(["Local Business", "Multi-Location", "Agency Max"]),
  billingInterval: z.enum(["monthly", "yearly"]).default("monthly"),
});

function buildCustomerRequest(input: {
  name: string;
  email?: string | null;
  workspaceId: string;
  useRecoveryAlias?: boolean;
}) {
  return {
    name: input.name,
    email: input.useRecoveryAlias
      ? buildRecoveryEmail(input.email, input.workspaceId)
      : input.email,
    number: input.workspaceId,
  };
}

function buildRecoveryEmail(email: string | null | undefined, workspaceId: string) {
  if (!email) return email;

  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return email;

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  const suffix = workspaceId.replace(/-/g, "").slice(0, 10);
  return `${local}+${suffix}@${domain}`;
}

async function createRecoverableSubscription(input: {
  amount: number;
  currency: string;
  cycleInterval: "month" | "year";
  cycleFrequency: number;
  workspaceId: string;
  savedCustomerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
}): Promise<{ subscription: GeideaSubscription; clearSavedCustomerId: boolean }> {
  const base = {
    amount: input.amount,
    currency: input.currency,
    cycleInterval: input.cycleInterval,
    cycleFrequency: input.cycleFrequency,
    merchantReferenceId: input.workspaceId,
  };

  if (input.savedCustomerId) {
    try {
      return {
        subscription: await createSubscription({
          ...base,
          customerId: input.savedCustomerId,
        }),
        clearSavedCustomerId: false,
      };
    } catch (err) {
      if (!isGeideaCustomerNotFoundError(err)) {
        throw err;
      }

      console.warn(
        `[checkout] saved Geidea customer not found for workspace ${input.workspaceId}; retrying with customerRequest`
      );
    }
  }

  try {
    return {
      subscription: await createSubscription({
        ...base,
        customer: buildCustomerRequest({
          name: input.customerName,
          email: input.customerEmail,
          workspaceId: input.workspaceId,
        }),
      }),
      clearSavedCustomerId: Boolean(input.savedCustomerId),
    };
  } catch (err) {
    if (!isGeideaDuplicateCustomerError(err)) {
      throw err;
    }

    return {
      subscription: await createSubscription({
        ...base,
        customer: buildCustomerRequest({
          name: input.customerName,
          email: input.customerEmail,
          workspaceId: input.workspaceId,
          useRecoveryAlias: true,
        }),
      }),
      clearSavedCustomerId: Boolean(input.savedCustomerId),
    };
  }
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan or billing interval." }, { status: 400 });
  }

  const { plan, billingInterval } = parsed.data;
  const planConfig = await getEffectivePlanGeideaConfig(plan, billingInterval);
  if (!planConfig) {
    return NextResponse.json(
      { error: "Payment is not configured for this plan. Please contact support." },
      { status: 503 }
    );
  }

  if (!process.env.GEIDEA_MERCHANT_PUBLIC_KEY || !process.env.GEIDEA_API_PASSWORD) {
    return NextResponse.json(
      { error: "Payment provider credentials are not configured." },
      { status: 503 }
    );
  }

  const workspaceId = await ensureWorkspaceForUser(
    session.user.id,
    session.user.name
  );
  if (!workspaceId) {
    return NextResponse.json({ error: "Unable to initialize workspace." }, { status: 500 });
  }

  let sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspaceId, workspaceId),
  });

  if (!sub) {
    const [created] = await db
      .insert(subscriptions)
      .values({
        workspaceId,
        plan: "free",
        status: "trialing",
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();
    sub = created;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const callbackUrl = `${appUrl}/api/subscription/webhook?plan=${encodeURIComponent(plan)}&interval=${billingInterval}`;
  const returnUrl = `${appUrl}/dashboard/settings?section=billing`;

  let geideaSubscription;
  let clearSavedCustomerId = false;
  try {
    const result = await createRecoverableSubscription({
      amount: planConfig.amount,
      currency: planConfig.currency,
      cycleInterval: planConfig.cycleInterval,
      cycleFrequency: planConfig.cycleFrequency,
      workspaceId,
      savedCustomerId: sub.geideaCustomerId,
      customerName: session.user.name,
      customerEmail: session.user.email,
    });
    geideaSubscription = result.subscription;
    clearSavedCustomerId = result.clearSavedCustomerId;
  } catch (err) {
    console.error("[checkout] createSubscription failed:", err);
    if (isGeideaSubscriptionNotEnabledError(err)) {
      return NextResponse.json(
        {
          error:
            "Recurring billing is not enabled on the payment account. Please contact support.",
          code: "geidea_subscriptions_not_enabled",
        },
        { status: 503 }
      );
    }

    if (!geideaSubscription && isGeideaDuplicateCustomerError(err)) {
      return NextResponse.json(
        {
          error:
            "Geidea already has a customer with this email. Please contact support to link the existing Geidea customer ID, then try again.",
          code: "geidea_duplicate_customer",
        },
        { status: 409 }
      );
    }

    if (!geideaSubscription && isGeideaCustomerNotFoundError(err)) {
      await db
        .update(subscriptions)
        .set({
          geideaCustomerId: null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.workspaceId, workspaceId));

      return NextResponse.json(
        {
          error:
            "The saved Geidea customer could not be found. Please retry checkout so a new payment customer can be created.",
          code: "geidea_customer_not_found",
        },
        { status: 409 }
      );
    }

    if (!geideaSubscription) {
      return NextResponse.json(
        { error: "Failed to initialize payment provider subscription. Please try again." },
        { status: 502 }
      );
    }
  }

  if (!geideaSubscription.subscriptionId) {
    return NextResponse.json(
      { error: "Payment provider did not return a subscription ID." },
      { status: 502 }
    );
  }

  await db
    .update(subscriptions)
    .set({
      geideaCustomerId:
        geideaSubscription.customerId ??
        (clearSavedCustomerId ? null : sub.geideaCustomerId),
      geideaSubscriptionId: geideaSubscription.subscriptionId,
      billingInterval,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.workspaceId, workspaceId));

  let checkoutSession;
  try {
    checkoutSession = await createSession({
      amount: planConfig.amount,
      currency: planConfig.currency,
      merchantReferenceId: workspaceId,
      subscriptionId: geideaSubscription.subscriptionId,
      callbackUrl,
      returnUrl,
    });
  } catch (err) {
    console.error("[checkout] createSession failed:", err);
    try {
      await cancelSubscription(geideaSubscription.subscriptionId);
    } catch (cancelErr) {
      console.error("[checkout] failed to cancel orphaned Geidea subscription:", cancelErr);
    }

    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 502 }
    );
  }

  if (!checkoutSession.id) {
    try {
      await cancelSubscription(geideaSubscription.subscriptionId);
    } catch (cancelErr) {
      console.error("[checkout] failed to cancel Geidea subscription after empty session:", cancelErr);
    }
    return NextResponse.json(
      { error: "Payment provider did not return a checkout session." },
      { status: 502 }
    );
  }

  return NextResponse.json({ sessionId: checkoutSession.id });
}
