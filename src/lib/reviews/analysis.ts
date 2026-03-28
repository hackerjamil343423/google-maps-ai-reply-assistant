import { db } from "@/lib/db";
import { businesses, reviewReplies, reviews } from "@/lib/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export interface ReviewData {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  reviewedAt: Date;
  hasReply: boolean;
}

export interface AggregatedReviewData {
  reviews: ReviewData[];
  totalCount: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  periodStart: Date;
  periodEnd: Date;
  repliedCount: number;
}

export async function aggregateReviewsForBusiness(
  businessId: string
): Promise<AggregatedReviewData> {
  if (!db) {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      reviews: [],
      totalCount: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      periodStart: thirtyDaysAgo,
      periodEnd: now,
      repliedCount: 0,
    };
  }

  const reviewRows = await db.query.reviews.findMany({
    where: eq(reviews.businessId, businessId),
    orderBy: [desc(reviews.reviewedAt)],
  });

  if (reviewRows.length === 0) {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      reviews: [],
      totalCount: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      periodStart: thirtyDaysAgo,
      periodEnd: now,
      repliedCount: 0,
    };
  }

  const reviewIds = reviewRows.map((r) => r.id);

  const replyRows = await db
    .select({ reviewId: reviewReplies.reviewId })
    .from(reviewReplies)
    .where(
      and(
        inArray(reviewReplies.reviewId, reviewIds),
        eq(reviewReplies.status, "posted")
      )
    );

  const repliedReviewIds = new Set(replyRows.map((r) => r.reviewId));

  const reviewData: ReviewData[] = reviewRows.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    rating: r.rating,
    text: r.text,
    reviewedAt: r.reviewedAt,
    hasReply: repliedReviewIds.has(r.id),
  }));

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;

  for (const review of reviewRows) {
    const star = Math.min(5, Math.max(1, review.rating));
    ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
    ratingSum += review.rating;
  }

  return {
    reviews: reviewData,
    totalCount: reviewRows.length,
    averageRating: Number((ratingSum / reviewRows.length).toFixed(2)),
    ratingDistribution,
    periodStart: reviewRows[reviewRows.length - 1].reviewedAt,
    periodEnd: reviewRows[0].reviewedAt,
    repliedCount: repliedReviewIds.size,
  };
}

export async function getBusinessesForWorkspace(workspaceId: string) {
  if (!db) return [];
  return db.query.businesses.findMany({
    where: and(
      eq(businesses.workspaceId, workspaceId),
      eq(businesses.status, "active")
    ),
    columns: {
      id: true,
      name: true,
      googleLocationId: true,
      connectedAt: true,
    },
    orderBy: [desc(businesses.connectedAt)],
  });
}
