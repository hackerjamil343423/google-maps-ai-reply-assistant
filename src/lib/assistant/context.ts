import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  aiSettings,
  assistantMessages,
  assistantThreads,
  businesses,
  reviewReplies,
  reviews,
  subscriptions,
  userProfiles,
  workspaceMembers,
} from "@/lib/db/schema";

type BuildContextInput = {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  workspaceId: string;
  threadId?: string;
};

export async function buildAssistantContext(input: BuildContextInput) {
  const fallback = {
    summary: [
      `User name: ${input.userName || "Unknown"}`,
      `User email: ${input.userEmail || "Unknown"}`,
      "Workspace context is unavailable.",
    ].join("\n"),
    history: [] as Array<{ role: "user" | "assistant"; content: string }>,
  };

  if (!db) {
    return fallback;
  }

  const [profile, membership, business, subscription, settings] =
    await Promise.all([
      db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, input.userId),
      }),
      db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          eq(workspaceMembers.userId, input.userId)
        ),
        columns: { role: true },
      }),
      db.query.businesses.findFirst({
        where: eq(businesses.workspaceId, input.workspaceId),
        orderBy: [desc(businesses.updatedAt)],
      }),
      db.query.subscriptions.findFirst({
        where: eq(subscriptions.workspaceId, input.workspaceId),
      }),
      db.query.aiSettings.findFirst({
        where: eq(aiSettings.workspaceId, input.workspaceId),
      }),
    ]);

  const [reviewStatsRow, repliedStatsRow] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .innerJoin(businesses, eq(reviews.businessId, businesses.id))
      .where(eq(businesses.workspaceId, input.workspaceId))
      .limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewReplies)
      .innerJoin(reviews, eq(reviewReplies.reviewId, reviews.id))
      .innerJoin(businesses, eq(reviews.businessId, businesses.id))
      .where(eq(businesses.workspaceId, input.workspaceId))
      .limit(1),
  ]);

  const reviewCount = reviewStatsRow[0]?.count ?? 0;
  const repliedCount = repliedStatsRow[0]?.count ?? 0;

  let history: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (input.threadId) {
    const thread = await db.query.assistantThreads.findFirst({
      where: and(
        eq(assistantThreads.id, input.threadId),
        eq(assistantThreads.workspaceId, input.workspaceId),
        eq(assistantThreads.userId, input.userId)
      ),
      columns: { id: true },
    });

    if (thread?.id) {
      const rows = await db.query.assistantMessages.findMany({
        where: eq(assistantMessages.threadId, thread.id),
        orderBy: [desc(assistantMessages.createdAt)],
        limit: 12,
      });

      history = rows
        .reverse()
        .map((item) => ({
          role: item.role,
          content: item.content,
        }))
        .filter((item) => item.content.trim().length > 0);
    }
  }

  const summary = [
    `User name: ${input.userName || "Unknown"}`,
    `User email: ${input.userEmail || "Unknown"}`,
    `User role in workspace: ${membership?.role || "unknown"}`,
    `Profile company: ${profile?.company || "Not set"}`,
    `Profile phone: ${profile?.phone || "Not set"}`,
    `Profile website: ${profile?.website || "Not set"}`,
    `Connected business: ${business?.name || "Not connected"}`,
    `Business status: ${business?.status || "disconnected"}`,
    `Subscription plan: ${subscription?.plan || "free"}`,
    `Subscription status: ${subscription?.status || "trialing"}`,
    `AI tone: ${settings?.tone || "Professional"}`,
    `Approval mode: ${settings?.approvalMode || "auto"}`,
    `Total synced reviews: ${reviewCount}`,
    `Total saved replies: ${repliedCount}`,
  ].join("\n");

  return { summary, history };
}
