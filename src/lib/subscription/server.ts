import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { businesses, subscriptions, usageCounters } from "@/lib/db/schema";
import { isKnownPlan, PLAN_LIMITS, type PlanInfo, type PlanName } from "./plans";

export type SubscriptionAccess = {
  allowed: boolean;
  reason?: "trial_expired" | "canceled" | "plan_limit" | "subscription_expired";
  plan: PlanName;
  planInfo: PlanInfo;
  status: string;
};

/**
 * Returns the workspace subscription access state.
 * allowed=true  → user can use AI / post features
 * allowed=false → user must upgrade or trial expired
 */
export async function getWorkspaceAccess(
  workspaceId: string
): Promise<SubscriptionAccess> {
  const fallback: SubscriptionAccess = {
    allowed: true,
    plan: "free",
    planInfo: PLAN_LIMITS["free"],
    status: "trialing",
  };

  if (!db) return fallback;

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspaceId, workspaceId),
  });

  if (!sub) return fallback;

  const plan = isKnownPlan(sub.plan) ? (sub.plan as PlanName) : "free";
  const planInfo = PLAN_LIMITS[plan];
  const status = sub.status;

  if (status === "canceled") {
    return { allowed: false, reason: "canceled", plan, planInfo, status };
  }

  if (status === "trialing") {
    const trialExpired = sub.trialEndsAt != null && sub.trialEndsAt < new Date();
    if (trialExpired) {
      return { allowed: false, reason: "trial_expired", plan, planInfo, status };
    }
  }

  if (status === "active" || status === "past_due") {
    const periodExpired =
      sub.currentPeriodEnd != null && sub.currentPeriodEnd < new Date();
    if (periodExpired) {
      return { allowed: false, reason: "subscription_expired", plan, planInfo, status };
    }
  }

  return { allowed: true, plan, planInfo, status };
}

/** Count active Google Business Profile connections for a workspace. */
export async function getConnectedAccountsCount(
  workspaceId: string
): Promise<number> {
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(businesses)
    .where(
      and(
        eq(businesses.workspaceId, workspaceId),
        eq(businesses.status, "active")
      )
    );
  return result[0]?.count ?? 0;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Atomically upsert and increment a usage counter for the current month.
 * Silently no-ops if db is unavailable.
 */
export async function incrementUsageCounter(
  workspaceId: string,
  field: "aiRepliesGenerated" | "reviewsManaged"
): Promise<void> {
  if (!db) return;
  const month = getCurrentMonthKey();

  const initialValues =
    field === "aiRepliesGenerated"
      ? { workspaceId, month, aiRepliesGenerated: 1, reviewsManaged: 0 }
      : { workspaceId, month, aiRepliesGenerated: 0, reviewsManaged: 1 };

  const incrementSet =
    field === "aiRepliesGenerated"
      ? {
          aiRepliesGenerated: sql`${usageCounters.aiRepliesGenerated} + 1`,
          updatedAt: new Date(),
        }
      : {
          reviewsManaged: sql`${usageCounters.reviewsManaged} + 1`,
          updatedAt: new Date(),
        };

  await db
    .insert(usageCounters)
    .values(initialValues)
    .onConflictDoUpdate({
      target: [usageCounters.workspaceId, usageCounters.month],
      set: incrementSet,
    });
}
