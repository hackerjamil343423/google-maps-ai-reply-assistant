import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { businesses, reviewAnalysisReports, reviews as reviewsTable } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { and, desc, eq, gte } from "drizzle-orm";
import { env } from "@/lib/env";
import { generateAnalysisReportFromUrl } from "@/lib/ai/generate-analysis-report";

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

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.MINIMAX_API_KEY) {
    return NextResponse.json({ error: "MINIMAX_API_KEY is not configured on the server" }, { status: 503 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 500 });
  }

  const body = await req.json();
  const { businessId, period, language } = body as {
    businessId?: string;
    period?: Period;
    language?: "en" | "ar";
  };

  if (!businessId || typeof businessId !== "string") {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  const selectedPeriod: Period = period ?? "this_month";
  const selectedLanguage: "en" | "ar" = language ?? "en";
  const periodBounds = computePeriodBounds(selectedPeriod);

  // Verify business belongs to this workspace and is active
  const business = await db.query.businesses.findFirst({
    where: and(
      eq(businesses.id, businessId),
      eq(businesses.workspaceId, workspaceId),
      eq(businesses.status, "active")
    ),
    columns: { id: true, name: true },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found or not connected" }, { status: 404 });
  }

  // Check monthly limit per business
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const existingReport = await db.query.reviewAnalysisReports.findFirst({
    where: and(
      gte(reviewAnalysisReports.generatedAt, thisMonth),
      eq(reviewAnalysisReports.businessId, businessId)
    ),
  });

  if (existingReport) {
    const nextMonth = new Date(thisMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return NextResponse.json(
      {
        error: `Report already generated for "${business.name}" this month. Next available: ${nextMonth.toLocaleDateString()}`,
        nextAvailable: nextMonth.toISOString(),
      },
      { status: 429 }
    );
  }

  // Fetch ALL synced reviews from DB for this business
  const dbReviews = await db.query.reviews.findMany({
    where: eq(reviewsTable.businessId, businessId),
    orderBy: [desc(reviewsTable.reviewedAt)],
    columns: { id: true, authorName: true, rating: true, text: true, reviewedAt: true },
  });

  // Filter by selected period
  const reviewsData = dbReviews.filter((review) => {
    const t = review.reviewedAt.getTime();
    return t >= periodBounds.start.getTime() && t <= periodBounds.end.getTime() + 86400000;
  });

  if (reviewsData.length === 0) {
    return NextResponse.json(
      {
        message:
          selectedPeriod === "all_time"
            ? `No reviews found for "${business.name}" yet.`
            : `No reviews found for "${business.name}" this month yet.`,
      },
      { status: 422 }
    );
  }

  // Generate report via MiniMax
  let reportData;
  try {
    const result = await generateAnalysisReportFromUrl(
      reviewsData,
      business.name,
      selectedLanguage,
      periodBounds.start,
      periodBounds.end
    );
    reportData = result.reportData;
  } catch (error) {
    console.error("MiniMax report generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate AI report. Please try again later." },
      { status: 502 }
    );
  }

  const [newReport] = await db
    .insert(reviewAnalysisReports)
    .values({
      businessId,
      businessName: business.name,
      language: selectedLanguage,
      workspaceId,
      reportData: JSON.stringify(reportData),
      reviewCount: reviewsData.length,
      periodStart: periodBounds.start,
      periodEnd: periodBounds.end,
    })
    .returning();

  return NextResponse.json({
    id: newReport.id,
    businessId,
    businessName: business.name,
    generatedAt: newReport.generatedAt.toISOString(),
    reviewCount: reviewsData.length,
    periodStart: newReport.periodStart.toISOString(),
    periodEnd: newReport.periodEnd.toISOString(),
    reportData,
  });
}
