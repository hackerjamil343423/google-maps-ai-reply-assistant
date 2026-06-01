import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import {
  createPaymentSession,
  createSession,
  createSubscription,
  cancelSubscription,
  isGeideaDuplicateCustomerError,
  isGeideaSubscriptionNotEnabledError,
} from "@/lib/geidea/client";
import { getEffectivePlanGeideaConfig } from "@/lib/subscription/pricing";
import { ensureWorkspaceForUser } from "@/lib/workspace";

const checkoutSchema = z.object({
  plan: z.enum(["Local Business", "Multi-Location", "Agency Max"]),
  billingInterval: z.enum(["monthly", "yearly"]).default("monthly"),
});

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
  try {
    geideaSubscription = await createSubscription({
      amount: planConfig.amount,
      currency: planConfig.currency,
      cycleInterval: planConfig.cycleInterval,
      cycleFrequency: planConfig.cycleFrequency,
      merchantReferenceId: workspaceId,
      customerId: sub.geideaCustomerId,
      customer: sub.geideaCustomerId
        ? undefined
        : {
            name: session.user.name,
            email: session.user.email,
            number: workspaceId,
          },
    });
  } catch (err) {
    console.error("[checkout] createSubscription failed:", err);
    if (isGeideaSubscriptionNotEnabledError(err)) {
      try {
        const checkoutSession = await createPaymentSession({
          amount: planConfig.amount,
          currency: planConfig.currency,
          merchantReferenceId: workspaceId,
          callbackUrl: `${callbackUrl}&mode=one_time`,
          returnUrl,
        });

        if (!checkoutSession.id) {
          return NextResponse.json(
            { error: "Payment provider did not return a checkout session." },
            { status: 502 }
          );
        }

        return NextResponse.json({
          sessionId: checkoutSession.id,
          mode: "one_time",
        });
      } catch (fallbackErr) {
        console.error("[checkout] create one-time payment session failed:", fallbackErr);
        return NextResponse.json(
          { error: "Failed to create checkout session. Please try again." },
          { status: 502 }
        );
      }
    }

    if (isGeideaDuplicateCustomerError(err)) {
      return NextResponse.json(
        {
          error:
            "Geidea already has a customer with this email. Please contact support to link the existing Geidea customer ID, then try again.",
          code: "geidea_duplicate_customer",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to initialize payment provider subscription. Please try again." },
      { status: 502 }
    );
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
      geideaCustomerId: geideaSubscription.customerId ?? sub.geideaCustomerId,
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
