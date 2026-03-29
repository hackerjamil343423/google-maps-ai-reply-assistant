import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { businesses, reviewAnalysisReports, reviews as reviewsTable } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { and, desc, eq, gte } from "drizzle-orm";
import { env } from "@/lib/env";
import { generateAnalysisReportFromUrl } from "@/lib/ai/generate-analysis-report";

type Period = "this_week" | "last_week" | "this_month" | "last_month" | "last_3_months" | "specific";

function computePeriodBounds(period: Period, specificYear?: number, specificMonth?: number): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysToMonday);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const threeMonthsStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);

  switch (period) {
    case "this_week":
      return { start: thisMonday, end: today };
    case "last_week":
      return { start: lastMonday, end: lastSunday };
    case "this_month":
      return { start: thisMonthStart, end: today };
    case "last_month":
      return { start: lastMonthStart, end: lastMonthEnd };
    case "last_3_months":
      return { start: threeMonthsStart, end: today };
    case "specific": {
      const year = specificYear ?? today.getFullYear();
      const month = (specificMonth ?? today.getMonth() + 1) - 1;
      return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0) };
    }
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
  const { businessId, period, year, month, language } = body as {
    businessId?: string;
    period?: Period;
    year?: number;
    month?: number;
    language?: "en" | "ar";
  };

  if (!businessId || typeof businessId !== "string") {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  const selectedPeriod: Period = period ?? "this_month";
  const selectedLanguage: "en" | "ar" = language ?? "en";
  const periodBounds = computePeriodBounds(selectedPeriod, year, month);

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
        error: `No synced reviews found for "${business.name}" in the selected period. Sync reviews first from the Reviews page.`,
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

  const now = new Date();

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
