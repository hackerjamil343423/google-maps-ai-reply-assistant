/**
 * Cron safety net: mark expired active subscriptions as past_due.
 *
 * Stripe's invoice.payment_failed webhook is the primary signal, but this
 * cron fires once per day as a backstop for any missed webhooks.
 *
 * Authorization: Bearer ${CRON_SECRET}  (skipped when CRON_SECRET is unset)
 */

import { and, eq, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db, dbSchema } from "@/lib/db";
import { env } from "@/lib/env";
import { sendRenewalFailedEmail } from "@/lib/emails";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  // 2-day grace period: only expire subscriptions that ended more than 2 days
  // ago. This gives Stripe webhooks time to arrive before we step in.
  const graceDeadline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const expired = await db
    .select({
      workspaceId: dbSchema.subscriptions.workspaceId,
      plan: dbSchema.subscriptions.plan,
      workspaceName: dbSchema.workspaces.name,
      ownerEmail: dbSchema.user.email,
      ownerName: dbSchema.user.name,
      ownerLanguage: dbSchema.userProfiles.language,
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
    .leftJoin(
      dbSchema.userProfiles,
      eq(dbSchema.userProfiles.userId, dbSchema.workspaces.ownerUserId)
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
          lang: row.ownerLanguage === "ar" ? "ar" : "en",
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

  return NextResponse.json({ processed: results.length, results });
}
