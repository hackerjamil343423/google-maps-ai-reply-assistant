import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { createSession, createSubscription } from "@/lib/geidea/client";
import { getPlanGeideaConfig } from "@/lib/subscription/plans";
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
  const planConfig = getPlanGeideaConfig(plan, billingInterval);
  if (!planConfig) {
    return NextResponse.json(
      { error: "Payment is not configured for this plan. Please contact support." },
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
  const geideaSubscription = await createSubscription({
    amount: planConfig.amount,
    currency: planConfig.currency,
    cycleInterval: planConfig.cycleInterval,
    cycleFrequency: planConfig.cycleFrequency,
    merchantReferenceId: workspaceId,
    customer: {
      name: session.user.name,
      email: session.user.email,
    },
  });

  if (!geideaSubscription.subscriptionId) {
    return NextResponse.json(
      { error: "Payment provider did not return a subscription ID." },
      { status: 502 }
    );
  }

  await db
    .update(subscriptions)
    .set({
      geideaCustomerId: geideaSubscription.customerId ?? sub?.geideaCustomerId ?? null,
      geideaSubscriptionId: geideaSubscription.subscriptionId,
      billingInterval,
      cancelAtPeriodEnd: false,
      scheduledDowngradePlan: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.workspaceId, workspaceId));

  const checkoutSession = await createSession({
    amount: planConfig.amount,
    currency: planConfig.currency,
    merchantReferenceId: workspaceId,
    subscriptionId: geideaSubscription.subscriptionId,
    callbackUrl: `${appUrl}/api/subscription/webhook?plan=${encodeURIComponent(plan)}&interval=${billingInterval}`,
    returnUrl: `${appUrl}/dashboard/settings?section=billing`,
  });

  if (!checkoutSession.id) {
    return NextResponse.json(
      { error: "Payment provider did not return a checkout session." },
      { status: 502 }
    );
  }

  return NextResponse.json({ sessionId: checkoutSession.id });
}
