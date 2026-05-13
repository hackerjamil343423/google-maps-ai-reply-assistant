import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db, dbSchema } from "@/lib/db";
import { sendRenewalFailedEmail } from "@/lib/emails";
import { getSubscription, validateCallbackSignature } from "@/lib/geidea/client";
import type { GeideaCallback } from "@/lib/geidea/types";
import { isKnownPlan } from "@/lib/subscription/plans";

function fallbackPeriodEnd(interval: string | null | undefined): Date {
  const days = interval === "yearly" ? 365 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getSubscriptionId(payload: GeideaCallback) {
  return (
    payload.subscriptionId ??
    payload.subscription?.subscriptionId ??
    payload.subscription?.id ??
    payload.order?.subscription?.subscriptionId ??
    payload.order?.subscription?.id ??
    null
  );
}

function getOrderId(payload: GeideaCallback) {
  return payload.orderId ?? payload.order?.orderId ?? payload.order?.id ?? null;
}

function getAgreementId(payload: GeideaCallback) {
  return (
    payload.agreementId ??
    payload.paymentMethod?.agreementId ??
    payload.order?.paymentMethod?.agreementId ??
    null
  );
}

function getTokenId(payload: GeideaCallback) {
  return (
    payload.tokenId ??
    payload.paymentMethod?.tokenId ??
    payload.order?.paymentMethod?.tokenId ??
    null
  );
}

function isPaid(payload: GeideaCallback) {
  const responseCode = payload.responseCode ?? payload.order?.responseCode;
  const detailedStatus = payload.detailedStatus ?? payload.order?.detailedStatus;
  const status = payload.status ?? payload.order?.status;

  return (
    responseCode === "000" ||
    detailedStatus?.toLowerCase() === "paid" ||
    status?.toLowerCase() === "paid" ||
    status?.toLowerCase() === "success"
  );
}

function isFailed(payload: GeideaCallback) {
  const detailedStatus = payload.detailedStatus ?? payload.order?.detailedStatus;
  const status = payload.status ?? payload.order?.status;
  return ["failed", "declined", "cancelled", "canceled"].includes(
    (detailedStatus ?? status ?? "").toLowerCase()
  );
}

function isCanceledSubscription(payload: GeideaCallback) {
  const status =
    payload.subscription?.status ??
    payload.order?.subscription?.status ??
    payload.status ??
    payload.order?.status;
  return ["cancelled", "canceled", "inactive"].includes((status ?? "").toLowerCase());
}

async function sendFailureEmail(workspaceId: string) {
  if (!db) return;

  const result = await db
    .select({
      plan: dbSchema.subscriptions.plan,
      workspaceName: dbSchema.workspaces.name,
      ownerEmail: dbSchema.user.email,
      ownerName: dbSchema.user.name,
    })
    .from(dbSchema.subscriptions)
    .innerJoin(
      dbSchema.workspaces,
      eq(dbSchema.workspaces.id, dbSchema.subscriptions.workspaceId)
    )
    .innerJoin(
      dbSchema.user,
      eq(dbSchema.user.id, dbSchema.workspaces.ownerUserId)
    )
    .where(eq(dbSchema.subscriptions.workspaceId, workspaceId))
    .limit(1);

  const row = result[0];
  if (!row) return;

  await sendRenewalFailedEmail({
    toEmail: row.ownerEmail,
    name: row.ownerName ?? row.ownerEmail,
    workspaceName: row.workspaceName,
    plan: row.plan,
  });
}

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as GeideaCallback | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!validateCallbackSignature(payload)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const geideaSubscriptionId = getSubscriptionId(payload);
  if (!geideaSubscriptionId) {
    return NextResponse.json({ received: true });
  }

  const sub = await db.query.subscriptions.findFirst({
    where: eq(dbSchema.subscriptions.geideaSubscriptionId, geideaSubscriptionId),
  });

  if (!sub) {
    console.warn(`[geidea] no local subscription for ${geideaSubscriptionId}`);
    return NextResponse.json({ received: true });
  }

  if (isCanceledSubscription(payload)) {
    await db
      .update(dbSchema.subscriptions)
      .set({
        status: "canceled",
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(dbSchema.subscriptions.workspaceId, sub.workspaceId));
    return NextResponse.json({ received: true });
  }

  if (isFailed(payload)) {
    await db
      .update(dbSchema.subscriptions)
      .set({ status: "past_due", updatedAt: new Date() })
      .where(eq(dbSchema.subscriptions.workspaceId, sub.workspaceId));

    try {
      await sendFailureEmail(sub.workspaceId);
    } catch (err) {
      console.error("[geidea] failed to send renewal failed email:", err);
    }

    return NextResponse.json({ received: true });
  }

  if (isPaid(payload)) {
    const planParam = req.nextUrl.searchParams.get("plan");
    const intervalParam = req.nextUrl.searchParams.get("interval");
    const plan =
      planParam && isKnownPlan(planParam) && planParam !== "free" ? planParam : sub.plan;
    const billingInterval = intervalParam === "yearly" ? "yearly" : sub.billingInterval;

    let nextOccurrenceDate =
      parseDate(payload.subscription?.nextOccurrenceDate) ??
      parseDate(payload.order?.subscription?.nextOccurrenceDate);

    if (!nextOccurrenceDate) {
      try {
        const remoteSub = await getSubscription(geideaSubscriptionId);
        nextOccurrenceDate = parseDate(remoteSub.nextOccurrenceDate);
      } catch (err) {
        console.error("[geidea] failed to fetch subscription after callback:", err);
      }
    }

    await db
      .update(dbSchema.subscriptions)
      .set({
        plan,
        status: "active",
        billingInterval,
        currentPeriodEnd: nextOccurrenceDate ?? fallbackPeriodEnd(billingInterval),
        geideaAgreementId: getAgreementId(payload) ?? sub.geideaAgreementId,
        geideaTokenId: getTokenId(payload) ?? sub.geideaTokenId,
        updatedAt: new Date(),
      })
      .where(eq(dbSchema.subscriptions.workspaceId, sub.workspaceId));

    console.log(
      `[geidea] paid subscription callback for workspace ${sub.workspaceId}, order=${getOrderId(payload) ?? "unknown"}`
    );
  }

  return NextResponse.json({ received: true });
}
