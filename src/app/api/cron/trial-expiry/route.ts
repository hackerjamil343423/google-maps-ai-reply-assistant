/**
 * Cron endpoint: send trial-expiry warning emails.
 *
 * Call this once per day (e.g. via Vercel Cron or an external scheduler).
 * It finds every workspace whose trial ends within the next 3 days (or
 * exactly 1 day) and emails the workspace owner.
 *
 * Authorization: Bearer ${CRON_SECRET}  (skipped when CRON_SECRET is unset)
 */

import { and, eq, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db, dbSchema } from "@/lib/db";
import { env } from "@/lib/env";
import { sendTrialExpiryEmail } from "@/lib/emails";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Warn when trial ends within 2 days
  const warningWindowEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  // Find subscriptions that are still trialing and expire in the next 3 days
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const expiringSoon = await db
    .select({
      workspaceId: dbSchema.subscriptions.workspaceId,
      trialEndsAt: dbSchema.subscriptions.trialEndsAt,
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
        eq(dbSchema.subscriptions.status, "trialing"),
        gte(dbSchema.subscriptions.trialEndsAt, now),
        lte(dbSchema.subscriptions.trialEndsAt, warningWindowEnd)
      )
    );

  const results: { workspaceId: string; sent: boolean; error?: string }[] = [];

  for (const row of expiringSoon) {
    if (!row.trialEndsAt) continue;

    try {
      await sendTrialExpiryEmail({
        toEmail: row.ownerEmail,
        name: row.ownerName ?? row.ownerEmail,
        workspaceName: row.workspaceName,
        trialEndsAt: row.trialEndsAt,
        lang: (row.ownerLanguage === "ar" ? "ar" : "en"),
      });
      results.push({ workspaceId: row.workspaceId, sent: true });
    } catch (err) {
      results.push({
        workspaceId: row.workspaceId,
        sent: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
