import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { subscriptions, userProfiles, workspaces } from "@/lib/db/schema";
import { sendCancellationScheduledEmail } from "@/lib/emails";
import { stripe } from "@/lib/stripe/client";
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

  if (sub.cancelAtPeriodEnd) {
    return NextResponse.json({
      success: true,
      alreadyScheduled: true,
      accessUntil: sub.currentPeriodEnd,
    });
  }

  if (!stripe || !sub.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "Payment provider not configured or no active subscription." },
      { status: 503 }
    );
  }

  try {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (err) {
    console.error("[cancel] Stripe update error:", err);
    return NextResponse.json(
      { error: "Failed to cancel subscription. Please try again or contact support." },
      { status: 502 }
    );
  }

  // The webhook will set cancelAtPeriodEnd=true when it arrives; set it locally
  // now for immediate UI feedback.
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(eq(subscriptions.workspaceId, workspaceId));

  try {
    const [ws, profile] = await Promise.all([
      db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) }),
      db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, session.user.id) }),
    ]);

    await sendCancellationScheduledEmail({
      toEmail: session.user.email,
      name: session.user.name,
      workspaceName: ws?.name ?? "your workspace",
      plan: sub.plan,
      accessUntil: sub.currentPeriodEnd,
      lang: profile?.language === "ar" ? "ar" : "en",
    });
  } catch (err) {
    console.error("[cancel] failed to send cancellation email:", err);
  }

  return NextResponse.json({ success: true, accessUntil: sub.currentPeriodEnd });
}
