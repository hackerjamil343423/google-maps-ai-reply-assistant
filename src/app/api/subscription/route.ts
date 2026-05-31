import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { businesses, subscriptions, usageCounters } from "@/lib/db/schema";
import { getSubscription as getGeideaSubscription } from "@/lib/geidea/client";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { getCached, setCached } from "@/lib/subscription/cache";
import {
  isKnownPlan,
  type PlanName,
} from "@/lib/subscription/plans";
import { getEffectivePlanCatalog } from "@/lib/subscription/pricing";

function getCurrentMonthKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatSar(value: number): string {
  return value.toLocaleString("en-US");
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({
      plan: "free",
      status: "trialing",
      price: "$0",
      trialEndsAt: "N/A",
      nextBillingAt: "N/A",
      connectedAccounts: 0,
      maxAccounts: 1,
      aiReplies: 0,
      reviewsManaged: 0,
    });
  }

  const workspaceId = await ensureWorkspaceForUser(
    session.user.id,
    session.user.name
  );
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Unable to initialize workspace." },
      { status: 500 }
    );
  }

  let subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspaceId, workspaceId),
  });

  if (!subscription) {
    const [created] = await db
      .insert(subscriptions)
      .values({
        workspaceId,
        plan: "free",
        status: "trialing",
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();
    subscription = created ?? null;
  }

  const planName = isKnownPlan(subscription?.plan ?? "")
    ? (subscription?.plan as PlanName)
    : "free";
  const planCatalog = await getEffectivePlanCatalog();
  const planInfo = planCatalog[planName];

  const connectedResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(businesses)
    .where(
      and(
        eq(businesses.workspaceId, workspaceId),
        eq(businesses.status, "active")
      )
    );
  const connectedAccounts = connectedResult[0]?.count ?? 0;

  const month = getCurrentMonthKey();
  const usage = await db.query.usageCounters.findFirst({
    where: and(
      eq(usageCounters.workspaceId, workspaceId),
      eq(usageCounters.month, month)
    ),
  });

  const billingInterval = subscription?.billingInterval ?? "monthly";
  const catalogPrice =
    billingInterval === "yearly"
      ? planInfo.yearlyPrice
      : planInfo.monthlyPrice;
  const price = formatSar(catalogPrice);
  let nextBillingAt = subscription?.currentPeriodEnd ?? null;

  if (subscription?.geideaSubscriptionId) {
    const cacheKey = `geidea-sub:${subscription.geideaSubscriptionId}`;
    try {
      let remoteData = getCached<{ nextOccurrenceDate?: string | null }>(cacheKey);
      if (!remoteData) {
        const remoteSubscription = await getGeideaSubscription(subscription.geideaSubscriptionId);
        remoteData = { nextOccurrenceDate: remoteSubscription.nextOccurrenceDate };
        setCached(cacheKey, remoteData);
      }
      nextBillingAt = parseDate(remoteData.nextOccurrenceDate) ?? nextBillingAt;
    } catch {
      // Fall back to the local value when Geidea is unavailable.
    }
  }

  return NextResponse.json({
    plan: planName,
    status: subscription?.status ?? "trialing",
    price,
    billingInterval,
    monthlyPrice: formatSar(planInfo.monthlyPrice),
    yearlyPrice: formatSar(planInfo.yearlyPrice),
    trialEndsAt: formatDate(subscription?.trialEndsAt),
    nextBillingAt: formatDate(nextBillingAt),
    connectedAccounts,
    maxAccounts: planInfo.maxAccounts,
    aiReplies: usage?.aiRepliesGenerated ?? 0,
    reviewsManaged: usage?.reviewsManaged ?? 0,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    scheduledDowngradePlan: subscription?.scheduledDowngradePlan ?? null,
  });
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Use POST /api/subscription/checkout to upgrade your plan." },
    { status: 405 }
  );
}
