import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";

import { generateBusinessComparisonReport } from "@/lib/ai/generate-comparison-report";
import { getRequestSession } from "@/lib/api/session";
import { getAccessibleBusinessIds } from "@/lib/business-access";
import { db } from "@/lib/db";
import {
  businesses,
  reviewComparisonReportBusinesses,
  reviewComparisonReports,
  reviews as reviewsTable,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getResponseStatsForBusiness } from "@/lib/reviews/analysis";
import { ensureWorkspaceForUser } from "@/lib/workspace";

type Period = "all_time" | "this_month";

function computePeriodBounds(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const allTimeStart = new Date(2000, 0, 1);

  switch (period) {
    case "all_time":
      return { start: allTimeStart, end: today };
    case "this_month":
      return { start: thisMonthStart, end: today };
  }
}

function normalizeBusinessIds(value: unknown) {
  if (!Array.isArray(value)) return null;
  const ids = value.filter((item): item is string => typeof item === "string");
  return ids.map((id) => id.trim()).filter(Boolean);
}

function buildComparisonKey(businessIds: string[]) {
  return [...businessIds].sort().join(":");
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.MINIMAX_API_KEY) {
    return NextResponse.json(
      { error: "MINIMAX_API_KEY is not configured on the server" },
      { status: 503 }
    );
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 500 });
  }

  const body = await req.json();
  const selectedBusinessIds = normalizeBusinessIds(body?.businessIds);
  const selectedPeriod: Period = body?.period === "all_time" ? "all_time" : "this_month";
  const selectedLanguage: "en" | "ar" = body?.language === "ar" ? "ar" : "en";

  if (!selectedBusinessIds) {
    return NextResponse.json({ error: "businessIds must be an array" }, { status: 400 });
  }

  const uniqueBusinessIds = [...new Set(selectedBusinessIds)];
  if (uniqueBusinessIds.length !== selectedBusinessIds.length) {
    return NextResponse.json(
      { error: "Select each business only once" },
      { status: 400 }
    );
  }

  if (uniqueBusinessIds.length < 2 || uniqueBusinessIds.length > 3) {
    return NextResponse.json(
      { error: "Select 2 or 3 businesses to compare" },
      { status: 400 }
    );
  }

  const accessibleBusinessIds = new Set(
    await getAccessibleBusinessIds(workspaceId, session.user.id)
  );
  const canAccessAll = uniqueBusinessIds.every((businessId) =>
    accessibleBusinessIds.has(businessId)
  );
  if (!canAccessAll) {
    return NextResponse.json(
      { error: "One or more businesses were not found or are not connected" },
      { status: 404 }
    );
  }

  const businessRows = await db.query.businesses.findMany({
    where: and(
      eq(businesses.workspaceId, workspaceId),
      eq(businesses.status, "active"),
      inArray(businesses.id, uniqueBusinessIds)
    ),
    columns: {
      id: true,
      name: true,
      googleLocationId: true,
    },
  });

  if (businessRows.length !== uniqueBusinessIds.length) {
    return NextResponse.json(
      { error: "One or more businesses were not found or are not connected" },
      { status: 404 }
    );
  }

  const businessById = new Map(businessRows.map((business) => [business.id, business]));
  const orderedBusinesses = uniqueBusinessIds.map((businessId) => businessById.get(businessId)!);
  const comparisonKey = buildComparisonKey(uniqueBusinessIds);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const existingReport = await db.query.reviewComparisonReports.findFirst({
    where: and(
      eq(reviewComparisonReports.workspaceId, workspaceId),
      eq(reviewComparisonReports.comparisonKey, comparisonKey),
      gte(reviewComparisonReports.generatedAt, thisMonth)
    ),
    orderBy: [desc(reviewComparisonReports.generatedAt)],
    columns: { id: true, generatedAt: true },
  });

  if (existingReport) {
    const nextMonth = new Date(thisMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return NextResponse.json(
      {
        error: `Comparison already generated for this business set this month. Next available: ${nextMonth.toLocaleDateString()}`,
        nextAvailable: nextMonth.toISOString(),
        existingReportId: existingReport.id,
      },
      { status: 429 }
    );
  }

  const periodBounds = computePeriodBounds(selectedPeriod);
  const periodEndExclusive = new Date(periodBounds.end.getTime() + 86400000);

  const reviewRows = await db.query.reviews.findMany({
    where: and(
      inArray(reviewsTable.businessId, uniqueBusinessIds),
      gte(reviewsTable.reviewedAt, periodBounds.start),
      lt(reviewsTable.reviewedAt, periodEndExclusive)
    ),
    orderBy: [desc(reviewsTable.reviewedAt)],
    columns: {
      id: true,
      businessId: true,
      authorName: true,
      rating: true,
      text: true,
      reviewedAt: true,
    },
  });

  const reviewsByBusiness = new Map<string, typeof reviewRows>();
  for (const business of orderedBusinesses) {
    reviewsByBusiness.set(business.id, []);
  }

  for (const review of reviewRows) {
    reviewsByBusiness.get(review.businessId)?.push(review);
  }

  const businessesWithoutReviews = orderedBusinesses.filter(
    (business) => (reviewsByBusiness.get(business.id)?.length ?? 0) === 0
  );

  if (businessesWithoutReviews.length > 0) {
    return NextResponse.json(
      {
        message: `No reviews found for: ${businessesWithoutReviews
          .map((business) => business.name)
          .join(", ")}`,
        missingBusinesses: businessesWithoutReviews.map((business) => ({
          id: business.id,
          name: business.name,
        })),
      },
      { status: 422 }
    );
  }

  const responseStatsByBusiness = new Map(
    await Promise.all(
      orderedBusinesses.map(async (business) => {
        const stats = await getResponseStatsForBusiness(
          business.id,
          periodBounds.start,
          periodEndExclusive
        );
        return [
          business.id,
          {
            totalReplied: stats.repliedCount,
            replyRatePercent: stats.replyRatePercent,
          },
        ] as const;
      })
    )
  );

  let reportData;
  let reviewCount;
  try {
    const result = await generateBusinessComparisonReport({
      language: selectedLanguage,
      periodStart: periodBounds.start,
      periodEnd: periodBounds.end,
      businesses: orderedBusinesses.map((business) => ({
        id: business.id,
        name: business.name,
        reviews: (reviewsByBusiness.get(business.id) ?? []).map((review) => ({
          id: review.id,
          authorName: review.authorName,
          rating: review.rating,
          text: review.text,
          reviewedAt: review.reviewedAt,
        })),
        responseStats:
          responseStatsByBusiness.get(business.id) ?? {
            totalReplied: 0,
            replyRatePercent: 0,
          },
      })),
    });
    reportData = result.reportData;
    reviewCount = result.reviewCount;
  } catch (error) {
    console.error("MiniMax comparison generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate AI comparison. Please try again later." },
      { status: 502 }
    );
  }

  const businessSnapshot = reportData.businesses.map((business) => ({
    businessId: business.businessId,
    businessName: business.businessName,
    totalReviews: business.totalReviews,
    averageRating: business.averageRating,
    replyRatePercent: business.responseStats.replyRatePercent,
  }));

  const [newReport] = await db
    .insert(reviewComparisonReports)
    .values({
      workspaceId,
      language: selectedLanguage,
      comparisonKey,
      businessCount: orderedBusinesses.length,
      businessSnapshot: JSON.stringify(businessSnapshot),
      reportData: JSON.stringify(reportData),
      reviewCount,
      periodStart: periodBounds.start,
      periodEnd: periodBounds.end,
    })
    .returning();

  await db.insert(reviewComparisonReportBusinesses).values(
    orderedBusinesses.map((business) => ({
      reportId: newReport.id,
      businessId: business.id,
      businessName: business.name,
    }))
  );

  return NextResponse.json({
    id: newReport.id,
    type: "comparison",
    businesses: orderedBusinesses.map((business) => ({
      id: business.id,
      name: business.name,
    })),
    businessCount: orderedBusinesses.length,
    generatedAt: newReport.generatedAt.toISOString(),
    reviewCount,
    periodStart: newReport.periodStart.toISOString(),
    periodEnd: newReport.periodEnd.toISOString(),
    reportData,
  });
}
