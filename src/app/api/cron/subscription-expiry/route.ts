/**
 * Cron endpoint: two responsibilities.
 *
 * 1. Mark expired active subscriptions as past_due (safety net for missed webhooks).
 *    - status="active" AND currentPeriodEnd < now - 2 days (grace period)
 *    - Send renewal failure email
 *
 * 2. Send downgrade activation emails when a scheduled downgrade's paid period
 *    has actually ended.
 *    - status="canceled" AND scheduledDowngradePlan != null AND currentPeriodEnd < now
 *    - Send downgrade ready email with auto-checkout link
 *    - Clear scheduledDowngradePlan so the email is only sent once (idempotency)
 *
 * Call once per day via Vercel Cron or an external scheduler.
 *
 * Authorization: Bearer ${CRON_SECRET}  (skipped when CRON_SECRET is unset)
 */

import { and, eq, isNotNull, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db, dbSchema } from "@/lib/db";
import { env } from "@/lib/env";
import { sendDowngradeReadyEmail, sendRenewalFailedEmail } from "@/lib/emails";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  // 2-day grace period: only expire subscriptions that ended more than 2 days ago.
  // This gives the Geidea callback time to arrive before we step in.
  const graceDeadline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const expired = await db
    .select({
      workspaceId: dbSchema.subscriptions.workspaceId,
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
    .where(
      and(
        eq(dbSchema.subscriptions.status, "active"),
        lt(dbSchema.subscriptions.currentPeriodEnd, graceDeadline)
      )
    );

  const results: { workspaceId: string; marked: boolean; emailed: boolean; error?: string }[] = [];

  for (const row of expired) {
    try {
      await db
        .update(dbSchema.subscriptions)
        .set({ status: "past_due", updatedAt: new Date() })
        .where(eq(dbSchema.subscriptions.workspaceId, row.workspaceId));

      let emailed = false;
      try {
        await sendRenewalFailedEmail({
          toEmail: row.ownerEmail,
          name: row.ownerName ?? row.ownerEmail,
          workspaceName: row.workspaceName,
          plan: row.plan,
        });
        emailed = true;
      } catch {
        // Email failure is non-fatal
      }

      results.push({ workspaceId: row.workspaceId, marked: true, emailed });
    } catch (err) {
      results.push({
        workspaceId: row.workspaceId,
        marked: false,
        emailed: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // --------------------------------------------------------------------
  // Downgrade activation emails: when a canceled sub's paid period has ended
  // and a downgrade was scheduled, email the user to set up the lower plan.
  // --------------------------------------------------------------------
  const now = new Date();

  const pendingDowngrades = await db
    .select({
      workspaceId: dbSchema.subscriptions.workspaceId,
      plan: dbSchema.subscriptions.plan,
      scheduledDowngradePlan: dbSchema.subscriptions.scheduledDowngradePlan,
      currentPeriodEnd: dbSchema.subscriptions.currentPeriodEnd,
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
    .where(
      and(
        eq(dbSchema.subscriptions.status, "canceled"),
        isNotNull(dbSchema.subscriptions.scheduledDowngradePlan),
        lt(dbSchema.subscriptions.currentPeriodEnd, now)
      )
    );

  const downgradeResults: {
    workspaceId: string;
    emailed: boolean;
    cleared: boolean;
    error?: string;
  }[] = [];

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  for (const row of pendingDowngrades) {
    if (!row.scheduledDowngradePlan) continue;
    try {
      const checkoutUrl = `${appUrl}/dashboard/settings?section=billing&autoCheckout=${encodeURIComponent(row.scheduledDowngradePlan)}`;

      let emailed = false;
      try {
        await sendDowngradeReadyEmail({
          toEmail: row.ownerEmail,
          name: row.ownerName ?? row.ownerEmail,
          workspaceName: row.workspaceName,
          fromPlan: row.plan,
          toPlan: row.scheduledDowngradePlan,
          accessUntil: row.currentPeriodEnd,
          checkoutUrl,
        });
        emailed = true;
      } catch {
        // Email failure is non-fatal; still clear the flag so we don't spam retries.
      }

      // Clear the intent so the email only fires once.
      await db
        .update(dbSchema.subscriptions)
        .set({ scheduledDowngradePlan: null, updatedAt: new Date() })
        .where(eq(dbSchema.subscriptions.workspaceId, row.workspaceId));

      downgradeResults.push({ workspaceId: row.workspaceId, emailed, cleared: true });
    } catch (err) {
      downgradeResults.push({
        workspaceId: row.workspaceId,
        emailed: false,
        cleared: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    downgrades: downgradeResults,
  });
}
