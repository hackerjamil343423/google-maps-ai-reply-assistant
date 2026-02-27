import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { businesses, reviewReplies, reviews } from "@/lib/db/schema";

export interface WorkspaceReviewRecord {
  reviewId: string;
  googleReviewId: string | null;
  businessId: string;
  businessName: string;
  googleLocationId: string | null;
  authorName: string;
  rating: number;
  text: string;
}

export async function getWorkspaceReviewById(
  workspaceId: string,
  reviewId: string
): Promise<WorkspaceReviewRecord | null> {
  if (!db) return null;

  const row = await db
    .select({
      reviewId: reviews.id,
      googleReviewId: reviews.googleReviewId,
      businessId: businesses.id,
      businessName: businesses.name,
      googleLocationId: businesses.googleLocationId,
      authorName: reviews.authorName,
      rating: reviews.rating,
      text: reviews.text,
    })
    .from(reviews)
    .innerJoin(businesses, eq(businesses.id, reviews.businessId))
    .where(and(eq(reviews.id, reviewId), eq(businesses.workspaceId, workspaceId)))
    .limit(1);

  return row[0] ?? null;
}

export async function getLatestReplyForReview(reviewId: string) {
  if (!db) return null;

  return db.query.reviewReplies.findFirst({
    where: eq(reviewReplies.reviewId, reviewId),
    orderBy: [desc(reviewReplies.createdAt)],
  });
}

export async function saveDraftReplyForReview(args: {
  reviewId: string;
  content: string;
  source: "ai" | "manual";
  userId: string;
}) {
  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const existingDraft = await db.query.reviewReplies.findFirst({
    where: and(
      eq(reviewReplies.reviewId, args.reviewId),
      eq(reviewReplies.status, "draft")
    ),
    orderBy: [desc(reviewReplies.createdAt)],
    columns: { id: true },
  });

  if (existingDraft?.id) {
    const [updated] = await db
      .update(reviewReplies)
      .set({
        content: args.content,
        source: args.source,
        status: "draft",
        createdBy: args.userId,
        updatedAt: new Date(),
      })
      .where(eq(reviewReplies.id, existingDraft.id))
      .returning({
        id: reviewReplies.id,
        content: reviewReplies.content,
        source: reviewReplies.source,
        status: reviewReplies.status,
      });
    return updated ?? null;
  }

  const [inserted] = await db
    .insert(reviewReplies)
    .values({
      reviewId: args.reviewId,
      content: args.content,
      source: args.source,
      status: "draft",
      createdBy: args.userId,
    })
    .returning({
      id: reviewReplies.id,
      content: reviewReplies.content,
      source: reviewReplies.source,
      status: reviewReplies.status,
    });

  return inserted ?? null;
}

export async function markReplyPosted(args: {
  reviewId: string;
  content: string;
  source: "ai" | "manual";
  userId: string;
}) {
  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const existingLatest = await db.query.reviewReplies.findFirst({
    where: eq(reviewReplies.reviewId, args.reviewId),
    orderBy: [desc(reviewReplies.createdAt)],
    columns: { id: true },
  });

  if (existingLatest?.id) {
    const [updated] = await db
      .update(reviewReplies)
      .set({
        content: args.content,
        source: args.source,
        status: "posted",
        createdBy: args.userId,
        postedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reviewReplies.id, existingLatest.id))
      .returning({
        id: reviewReplies.id,
        content: reviewReplies.content,
        source: reviewReplies.source,
        status: reviewReplies.status,
        postedAt: reviewReplies.postedAt,
      });

    return updated ?? null;
  }

  const [inserted] = await db
    .insert(reviewReplies)
    .values({
      reviewId: args.reviewId,
      content: args.content,
      source: args.source,
      status: "posted",
      createdBy: args.userId,
      postedAt: new Date(),
    })
    .returning({
      id: reviewReplies.id,
      content: reviewReplies.content,
      source: reviewReplies.source,
      status: reviewReplies.status,
      postedAt: reviewReplies.postedAt,
    });

  return inserted ?? null;
}
