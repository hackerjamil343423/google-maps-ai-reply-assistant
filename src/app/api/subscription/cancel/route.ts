import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { subscriptions, workspaces } from "@/lib/db/schema";
import { sendCancellationScheduledEmail } from "@/lib/emails";
import { cancelSubscription } from "@/lib/streampay/client";
import { ensureWorkspaceForUser } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

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

  if (sub.status !== "active" && sub.status !== "past_due") {
    return NextResponse.json(
      { error: "Only active or past_due subscriptions can be cancelled." },
      { status: 400 }
    );
  }

  if (!sub.streamSubscriptionId) {
    return NextResponse.json(
      { error: "No StreamPay subscription linked. Please contact support." },
      { status: 400 }
    );
  }

  // Idempotent: already scheduled to cancel
  if (sub.cancelAtPeriodEnd) {
    return NextResponse.json({
      success: true,
      alreadyScheduled: true,
      accessUntil: sub.currentPeriodEnd,
    });
  }

  // Mark locally BEFORE calling StreamPay so the webhook (which fires
  // immediately after the cancel call) sees the flag and can be consistent.
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(eq(subscriptions.workspaceId, workspaceId));

  // Cancel in StreamPay — keep current invoice intact (no refund).
  // Roll back the flag if the call fails.
  try {
    await cancelSubscription(sub.streamSubscriptionId, { cancelOngoingInvoices: false });
  } catch (err) {
    console.error("[cancel] StreamPay cancelSubscription error:", err);
    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: false, updatedAt: new Date() })
      .where(eq(subscriptions.workspaceId, workspaceId));

    return NextResponse.json(
      { error: "Failed to cancel subscription. Please try again or contact support." },
      { status: 502 }
    );
  }

  // Send confirmation email (non-blocking)
  try {
    const ws = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    await sendCancellationScheduledEmail({
      toEmail: session.user.email,
      name: session.user.name,
      workspaceName: ws?.name ?? "your workspace",
      plan: sub.plan,
      accessUntil: sub.currentPeriodEnd,
    });
  } catch (err) {
    console.error("[cancel] failed to send cancellation email:", err);
  }

  return NextResponse.json({ success: true, accessUntil: sub.currentPeriodEnd });
}
