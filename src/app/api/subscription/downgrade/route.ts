import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { businesses, subscriptions } from "@/lib/db/schema";
import { cancelSubscription } from "@/lib/streampay/client";
import { PLAN_LIMITS } from "@/lib/subscription/plans";
import { ensureWorkspaceForUser } from "@/lib/workspace";

const PLAN_RANK: Record<string, number> = {
  free: 0,
  "Local Business": 1,
  "Multi-Location": 2,
  "Agency Max": 3,
};

const downgradeSchema = z.object({
  targetPlan: z.enum(["Local Business", "Multi-Location"]),
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
  const parsed = downgradeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid target plan." }, { status: 400 });
  }

  const { targetPlan } = parsed.data;

  const workspaceId = await ensureWorkspaceForUser(
    session.user.id,
    session.user.name
  );
  if (!workspaceId) {
    return NextResponse.json({ error: "Unable to initialize workspace." }, { status: 500 });
  }

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspaceId, workspaceId),
  });

  if (!sub) {
    return NextResponse.json({ error: "No subscription found." }, { status: 404 });
  }

  if (sub.status !== "active") {
    return NextResponse.json(
      { error: "Only active subscriptions can be downgraded." },
      { status: 400 }
    );
  }

  if (sub.cancelAtPeriodEnd || sub.scheduledDowngradePlan) {
    return NextResponse.json(
      { error: "A cancellation or downgrade is already scheduled for this subscription." },
      { status: 400 }
    );
  }

  const currentRank = PLAN_RANK[sub.plan] ?? 0;
  const targetRank = PLAN_RANK[targetPlan] ?? 0;

  if (targetRank >= currentRank) {
    return NextResponse.json(
      { error: "Target plan is not lower than the current plan. Use upgrade for plan changes to higher tiers." },
      { status: 400 }
    );
  }

  if (!sub.streamSubscriptionId) {
    return NextResponse.json(
      { error: "No StreamPay subscription linked. Please contact support." },
      { status: 400 }
    );
  }

  // Check for account limit warning
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(businesses)
    .where(
      and(
        eq(businesses.workspaceId, workspaceId),
        eq(businesses.status, "active")
      )
    );
  const connectedAccounts = countResult[0]?.count ?? 0;
  const newMaxAccounts = PLAN_LIMITS[targetPlan]?.maxAccounts ?? 1;
  const excessAccounts = connectedAccounts - newMaxAccounts;

  const warning =
    excessAccounts > 0
      ? `You have ${connectedAccounts} connected profile(s). The ${targetPlan} plan allows ${newMaxAccounts}. You will need to disconnect ${excessAccounts} profile(s) after the downgrade takes effect.`
      : null;

  // Persist the downgrade intent BEFORE calling StreamPay so the webhook
  // (which fires immediately after the cancel call) can see the intent.
  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: true,
      scheduledDowngradePlan: targetPlan,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.workspaceId, workspaceId));

  // Cancel in StreamPay; roll back the DB flags if the call fails
  try {
    await cancelSubscription(sub.streamSubscriptionId, { cancelOngoingInvoices: false });
  } catch (err) {
    console.error("[downgrade] StreamPay cancelSubscription error:", err);
    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: false,
        scheduledDowngradePlan: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.workspaceId, workspaceId));

    return NextResponse.json(
      { error: "Failed to schedule downgrade. Please try again or contact support." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    downgradeTo: targetPlan,
    accessUntil: sub.currentPeriodEnd,
    ...(warning ? { warning } : {}),
  });
}
