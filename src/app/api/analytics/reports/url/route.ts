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

  // Get Monday of current week (day index 0 = Sunday, 1 = Monday, ...)
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
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return { start, end };
    }
  }
}

function periodLabel(period: Period, specificYear?: number, specificMonth?: number): string {
  switch (period) {
    case "this_week": return "This Week";
    case "last_week": return "Last Week";
    case "this_month": return "This Month";
    case "last_month": return "Last Month";
    case "last_3_months": return "Last 3 Months";
    case "specific": {
      const d = new Date(specificYear ?? 2026, (specificMonth ?? 1) - 1, 1);
      return d.toLocaleString("en", { month: "long", year: "numeric" });
    }
  }
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY is not configured on the server" }, { status: 503 });
  }

  if (!env.MINIMAX_API_KEY) {
    return NextResponse.json({ error: "MINIMAX_API_KEY is not configured on the server" }, { status: 503 });
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 500 });
  }

  const body = await req.json();
  const { placeId, period, year, month, language } = body as {
    placeId?: string;
    period?: Period;
    year?: number;
    month?: number;
    language?: "en" | "ar";
  };

  if (!placeId || typeof placeId !== "string") {
    return NextResponse.json({ error: "placeId is required" }, { status: 400 });
  }

  const selectedPeriod: Period = period ?? "this_month";
  const selectedLanguage: "en" | "ar" = language ?? "en";
  const periodBounds = computePeriodBounds(selectedPeriod, year, month);
  const periodLabelStr = periodLabel(selectedPeriod, year, month);

  // Check monthly limit per placeId
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  if (db) {
    const existingReport = await db.query.reviewAnalysisReports.findFirst({
      where: and(
        gte(reviewAnalysisReports.generatedAt, thisMonth),
        eq(reviewAnalysisReports.businessId, placeId)
      ),
    });

    if (existingReport) {
      const nextMonth = new Date(thisMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return NextResponse.json(
        {
          error: `Report already generated for this business this month. Next available: ${nextMonth.toLocaleDateString()}`,
          nextAvailable: nextMonth.toISOString(),
        },
        { status: 429 }
      );
    }
  }

  // Fetch place details from Google Places API (separate call, no reviews yet)
  let businessName = "Business";
  let resolvedPlaceId = placeId;

  let placeDetails: {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
  } = {};

  try {
    const placeRes = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount",
        },
        cache: "no-store",
      }
    );
    if (!placeRes.ok) {
      const errorText = await placeRes.text();
      console.error("Google Places API error:", placeRes.status, errorText);
      return NextResponse.json(
        { error: `Google Places API error (${placeRes.status}): ${errorText.substring(0, 200)}` },
        { status: 502 }
      );
    }
    placeDetails = await placeRes.json();
  } catch (error) {
    console.error("Google Places fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to connect to Google Places API. Check your network or API key." },
      { status: 502 }
    );
  }

  businessName = placeDetails.displayName?.text?.trim() || "Business";
  resolvedPlaceId = placeDetails.id || placeId;

  // Fetch reviews from Google Places API (returns up to 5 reviews per call)
  let allReviews: Array<{
    rating?: number;
    text?: { text?: string };
    publishTime?: string;
    authorAttribution?: { displayName?: string };
  }> = [];

  // First check: does this workspace have a connected business matching this placeId?
  let useConnectedReviews = false;
  let connectedBusinessReviews: Array<{
    id: string;
    authorName: string;
    rating: number;
    text: string;
    reviewedAt: Date;
  }> = [];

  if (db) {
    // Check if workspace has an active connected business
    const connectedBusiness = await db.query.businesses.findFirst({
      where: and(
        eq(businesses.workspaceId, workspaceId),
        eq(businesses.status, "active")
      ),
      columns: { id: true, name: true, googleLocationId: true },
    });

    if (connectedBusiness?.id) {
      // Fetch ALL synced reviews from the database for this connected business
      const dbReviews = await db.query.reviews.findMany({
        where: eq(reviewsTable.businessId, connectedBusiness.id),
        orderBy: [desc(reviewsTable.reviewedAt)],
        columns: { id: true, authorName: true, rating: true, text: true, reviewedAt: true },
      });

      if (dbReviews.length > 0) {
        useConnectedReviews = true;
        connectedBusinessReviews = dbReviews;
        console.log(`Using ${dbReviews.length} connected business reviews from DB (vs 5 from Places API)`);
      }
    }
  }

  if (!useConnectedReviews) {
    // Fallback: fetch up to 5 reviews from Google Places API
    try {
      const reviewsRes = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(resolvedPlaceId)}`,
        {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask": "reviews.rating,reviews.text,reviews.publishTime,reviews.authorAttribution.displayName",
          },
          cache: "no-store",
        }
      );

      if (reviewsRes.ok) {
        const reviewsJson = await reviewsRes.json();
        allReviews = reviewsJson.reviews ?? [];
      } else {
        console.error("Google Places reviews fetch error:", reviewsRes.status);
      }
    } catch (error) {
      console.error("Google Places reviews fetch failed:", error);
    }
  }

  const reviewsData = useConnectedReviews
    ? connectedBusinessReviews
        // Filter to selected period
        .filter((item) => {
          const t = item.reviewedAt.getTime();
          return t >= periodBounds.start.getTime() && t <= periodBounds.end.getTime() + 86400000;
        })
    : allReviews
        .map((review, index) => {
          const text = review.text?.text?.trim() || "";
          if (!text) return null;
          const reviewedAt = review.publishTime ? new Date(review.publishTime) : new Date();
          const uniqueSuffix = `${Date.now().toString(36)}-${index.toString(36)}`;
          return {
            id: `${resolvedPlaceId}-review-${uniqueSuffix}`,
            authorName: review.authorAttribution?.displayName?.trim() || "Customer",
            rating: Math.max(1, Math.min(5, Number(review.rating) || 5)),
            text,
            reviewedAt,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        // Filter to selected period
        .filter((item) => {
          const t = item.reviewedAt.getTime();
          return t >= periodBounds.start.getTime() && t <= periodBounds.end.getTime() + 86400000;
        });

  if (reviewsData.length === 0) {
    return NextResponse.json(
      {
        error: `No public reviews found for "${businessName}" for ${periodLabelStr}. Try a different period.`,
      },
      { status: 422 }
    );
  }

  // Generate report via MiniMax
  let reportData;
  try {
    const result = await generateAnalysisReportFromUrl(
      reviewsData,
      businessName,
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

  if (db) {
    const [newReport] = await db
      .insert(reviewAnalysisReports)
      .values({
        businessId: resolvedPlaceId,
        businessName,
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
      businessId: resolvedPlaceId,
      businessName,
      generatedAt: newReport.generatedAt.toISOString(),
      reviewCount: reviewsData.length,
      periodStart: newReport.periodStart.toISOString(),
      periodEnd: newReport.periodEnd.toISOString(),
      reportData,
    });
  }

  return NextResponse.json({
    id: null,
    businessId: resolvedPlaceId,
    businessName,
    generatedAt: now.toISOString(),
    reviewCount: reviewsData.length,
    periodStart: periodBounds.start.toISOString(),
    periodEnd: periodBounds.end.toISOString(),
    reportData,
  });
}
