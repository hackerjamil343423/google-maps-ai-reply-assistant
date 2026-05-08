import { NextResponse } from "next/server";
import { count, avg, eq, sql } from "drizzle-orm";

import { adminGuard } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import { reviews, reviewReplies } from "@/lib/db/schema";

export const GET = adminGuard(async () => {
  if (!db) {
    return NextResponse.json({
      totalReviews: 0, totalReplies: 0, aiReplies: 0, manualReplies: 0, avgRating: 0,
    });
  }

  const [reviewStats] = await db
    .select({
      total: count(),
      avgRating: avg(reviews.rating),
    })
    .from(reviews);

  const [aiStats] = await db
    .select({ count: count() })
    .from(reviewReplies)
    .where(eq(reviewReplies.source, "ai"));

  const [manualStats] = await db
    .select({ count: count() })
    .from(reviewReplies)
    .where(eq(reviewReplies.source, "manual"));

  const totalReplies = (aiStats?.count ?? 0) + (manualStats?.count ?? 0);

  return NextResponse.json({
    totalReviews: reviewStats?.total ?? 0,
    totalReplies,
    aiReplies: aiStats?.count ?? 0,
    manualReplies: manualStats?.count ?? 0,
    avgRating: Number(reviewStats?.avgRating ?? 0),
  });
});
