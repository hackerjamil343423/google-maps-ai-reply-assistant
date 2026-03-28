import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { reviewAnalysisReports } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { gte } from "drizzle-orm";
import { env } from "@/lib/env";
import { extractPlaceIdFromGoogleMapsUrl, isValidGoogleMapsUrl } from "@/lib/reviews/google-maps-url";
import { generateAnalysisReportFromUrl } from "@/lib/ai/generate-analysis-report";

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 500 });
  }

  const body = await req.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Google Maps URL is required" }, { status: 400 });
  }

  if (!isValidGoogleMapsUrl(url)) {
    return NextResponse.json({ error: "Invalid Google Maps URL" }, { status: 400 });
  }

  if (!env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY is not configured" }, { status: 503 });
  }

  // Extract place ID
  const placeId = extractPlaceIdFromGoogleMapsUrl(url);
  if (!placeId) {
    return NextResponse.json(
      { error: "Could not extract place ID from URL. Please use a direct Google Maps place URL." },
      { status: 400 }
    );
  }

  // Check monthly limit — use a fixed key based on the placeId
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  if (db) {
    const existingReport = await db.query.reviewAnalysisReports.findFirst({
      where: gte(reviewAnalysisReports.generatedAt, thisMonth),
    });

    // Simple per-workspace monthly limit for URL-based reports
    if (existingReport) {
      const nextMonth = new Date(thisMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return NextResponse.json(
        {
          error: "Report already generated this month via URL",
          nextAvailable: nextMonth.toISOString(),
        },
        { status: 429 }
      );
    }
  }

  // Fetch reviews from Google Places API
  let reviewsData: {
    name: string;
    address: string;
    rating: number | null;
    reviews: Array<{
      id: string;
      authorName: string;
      rating: number;
      text: string;
      reviewedAt: Date;
    }>;
  };

  try {
    const upstream = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,rating,userRatingCount,reviews.rating,reviews.text,reviews.publishTime,reviews.authorAttribution.displayName",
        },
        cache: "no-store",
      }
    );

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return NextResponse.json(
        { error: `Google Places API error: ${upstream.status} ${errorText}` },
        { status: 502 }
      );
    }

    const details = await upstream.json() as {
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
      reviews?: Array<{
        rating?: number;
        text?: { text?: string };
        publishTime?: string;
        authorAttribution?: { displayName?: string };
      }>;
    };

    const businessName = details.displayName?.text?.trim() || "Business";
    const businessId = details.id || placeId;

    reviewsData = {
      name: businessName,
      address: details.formattedAddress?.trim() || "",
      rating: details.rating ?? null,
      reviews: (details.reviews ?? [])
        .map((review, index) => {
          const text = review.text?.text?.trim() || "";
          if (!text) return null;
          return {
            id: `${businessId}-review-${index}`,
            authorName: review.authorAttribution?.displayName?.trim() || "Customer",
            rating: Math.max(1, Math.min(5, Number(review.rating) || 5)),
            text,
            reviewedAt: review.publishTime ? new Date(review.publishTime) : new Date(),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    };
  } catch (error) {
    console.error("Failed to fetch reviews from Google Places:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews from Google Maps" },
      { status: 502 }
    );
  }

  if (reviewsData.reviews.length === 0) {
    return NextResponse.json(
      { error: "No reviews found for this place" },
      { status: 400 }
    );
  }

  // Generate report
  const { reportData } = await generateAnalysisReportFromUrl(reviewsData.reviews, reviewsData.name);

  // Save report with placeId as businessId
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  if (db) {
    const [newReport] = await db
      .insert(reviewAnalysisReports)
      .values({
        businessId: placeId,
        workspaceId,
        reportData: JSON.stringify(reportData),
        reviewCount: reviewsData.reviews.length,
        periodStart: thirtyDaysAgo,
        periodEnd: now,
      })
      .returning();

    return NextResponse.json({
      id: newReport.id,
      businessId: placeId,
      businessName: reviewsData.name,
      generatedAt: newReport.generatedAt.toISOString(),
      reviewCount: newReport.reviewCount,
      periodStart: newReport.periodStart.toISOString(),
      periodEnd: newReport.periodEnd.toISOString(),
      reportData,
    });
  }

  return NextResponse.json({
    id: null,
    businessId: placeId,
    businessName: reviewsData.name,
    generatedAt: now.toISOString(),
    reviewCount: reviewsData.reviews.length,
    periodStart: thirtyDaysAgo.toISOString(),
    periodEnd: now.toISOString(),
    reportData,
  });
}
