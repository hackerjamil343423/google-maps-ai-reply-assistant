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

export interface ResponseStatsData {
  totalReviews: number;
  repliedCount: number;
  replyRatePercent: number;
}

function isWithinPeriod(date: Date, periodStart?: Date, periodEnd?: Date) {
  const time = date.getTime();
  if (periodStart && time < periodStart.getTime()) return false;
  if (periodEnd && time > periodEnd.getTime()) return false;
  return true;
}

export async function getResponseStatsForBusiness(
  businessId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<ResponseStatsData> {
  if (!db) {
    return { totalReviews: 0, repliedCount: 0, replyRatePercent: 0 };
  }

  const reviewRows = await db.query.reviews.findMany({
    where: eq(reviews.businessId, businessId),
    columns: {
      id: true,
      reviewedAt: true,
    },
    orderBy: [desc(reviews.reviewedAt)],
  });

  const scopedReviews = reviewRows.filter((review) =>
    isWithinPeriod(review.reviewedAt, periodStart, periodEnd)
  );

  if (scopedReviews.length === 0) {
    return { totalReviews: 0, repliedCount: 0, replyRatePercent: 0 };
  }

  const replyRows = await db
    .select({ reviewId: reviewReplies.reviewId })
    .from(reviewReplies)
    .where(
      and(
        inArray(
          reviewReplies.reviewId,
          scopedReviews.map((review) => review.id)
        ),
        eq(reviewReplies.status, "posted")
      )
    );

  const repliedCount = new Set(replyRows.map((row) => row.reviewId)).size;
  const totalReviews = scopedReviews.length;

  return {
    totalReviews,
    repliedCount,
    replyRatePercent: totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 100) : 0,
  };
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
  const responseStats = await getResponseStatsForBusiness(businessId);
  const repliedCount = responseStats.repliedCount;
  const replyRows = repliedCount
    ? await db
        .select({ reviewId: reviewReplies.reviewId })
        .from(reviewReplies)
        .where(
          and(
            inArray(reviewReplies.reviewId, reviewIds),
            eq(reviewReplies.status, "posted")
          )
        )
    : [];
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
    repliedCount,
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
