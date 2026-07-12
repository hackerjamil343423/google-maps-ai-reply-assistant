import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getClientIp } from "@/lib/api/client-ip";
import { consumeRateLimitDurable } from "@/lib/api/rate-limit";
import { env } from "@/lib/env";

const querySchema = z.object({
  placeId: z.string().trim().min(2).max(200),
});

interface PlacesDetailsResponse {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  reviews?: Array<{
    rating?: number;
    text?: {
      text?: string;
    };
    originalText?: {
      text?: string;
    };
    publishTime?: string;
    authorAttribution?: {
      displayName?: string;
    };
  }>;
}

function extractPlacesErrorText(body: unknown) {
  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed || "Google Places request failed.";
  }

  if (!body || typeof body !== "object") {
    return "Google Places request failed.";
  }

  const errorBody = body as { error?: { message?: string } };
  return errorBody.error?.message || "Google Places request failed.";
}

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is not configured." },
      { status: 503 }
    );
  }

  const parsedQuery = querySchema.safeParse({
    placeId: req.nextUrl.searchParams.get("placeId"),
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid place id." }, { status: 400 });
  }

  const rate = await consumeRateLimitDurable(
    `places-reviews:${getClientIp(req)}`,
    10,
    60 * 1000
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 }
    );
  }

  try {
    const encodedPlaceId = encodeURIComponent(parsedQuery.data.placeId);
    const upstream = await fetch(
      `https://places.googleapis.com/v1/places/${encodedPlaceId}`,
      {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,rating,userRatingCount,reviews.rating,reviews.text,reviews.originalText,reviews.publishTime,reviews.authorAttribution.displayName",
        },
        cache: "no-store",
      }
    );

    const upstreamText = await upstream.text();
    let upstreamBody: unknown = upstreamText;
    try {
      upstreamBody = JSON.parse(upstreamText);
    } catch {
      // Keep raw body fallback.
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: extractPlacesErrorText(upstreamBody) },
        { status: upstream.status >= 500 ? 502 : upstream.status }
      );
    }

    const details = upstreamBody as PlacesDetailsResponse;
    const businessId = details.id || parsedQuery.data.placeId;
    const businessName = details.displayName?.text?.trim() || "Business";
    const businessAddress = details.formattedAddress?.trim() || "";

    const reviews = (details.reviews ?? [])
      .map((review, index) => {
        const text = review.originalText?.text?.trim() || review.text?.text?.trim() || "";
        if (!text) return null;

        return {
          id: `${businessId}-review-${index}`,
          authorName: review.authorAttribution?.displayName?.trim() || "Customer",
          rating: Math.max(1, Math.min(5, Number(review.rating) || 5)),
          text,
          publishedAt: review.publishTime || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 3);

    return NextResponse.json({
      business: {
        id: businessId,
        name: businessName,
        address: businessAddress,
        rating: details.rating ?? null,
        userRatingCount: details.userRatingCount ?? null,
      },
      reviews,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load business reviews." },
      { status: 500 }
    );
  }
}
