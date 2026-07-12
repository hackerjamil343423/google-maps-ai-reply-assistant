import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getClientIp } from "@/lib/api/client-ip";
import { consumeRateLimitDurable } from "@/lib/api/rate-limit";
import { env } from "@/lib/env";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
});

interface PlacesSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: {
      text?: string;
    };
    formattedAddress?: string;
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
    q: req.nextUrl.searchParams.get("q"),
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid search query." }, { status: 400 });
  }

  const rate = await consumeRateLimitDurable(
    `places-search:${getClientIp(req)}`,
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
    const upstream = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
      },
      body: JSON.stringify({
        textQuery: parsedQuery.data.q,
        pageSize: 5,
      }),
      cache: "no-store",
    });

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

    const searchBody = upstreamBody as PlacesSearchResponse;
    const results = (searchBody.places ?? [])
      .filter((item) => item.id && item.displayName?.text)
      .map((item) => {
        const id = item.id as string;
        const name = item.displayName?.text?.trim() || "Business";
        const address = item.formattedAddress?.trim() || "";
        return {
          id,
          name,
          address,
          label: address ? `${name} - ${address}` : name,
        };
      });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to search businesses." },
      { status: 500 }
    );
  }
}
