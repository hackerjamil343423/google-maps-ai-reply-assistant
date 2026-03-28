/**
 * Parses a Google Maps URL and extracts the place ID.
 * Supports:
 * - https://www.google.com/maps/place/.../@.../data=!3m1!4b1!4m6!3m5!1sPLACE_ID:...
 * - https://www.google.com/maps/search/.../@.../data=!1sPLACE_ID:...
 * - https://maps.app.goo.gl/... (short URL - returns null)
 */
export function extractPlaceIdFromGoogleMapsUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    // Short URL (maps.app.goo.gl) - can't resolve without fetching
    if (
      parsed.hostname.includes("goo.gl") ||
      parsed.hostname.includes("maps.app.goo.gl")
    ) {
      return null;
    }

    // Try to find !1sPLACE_ID pattern in the URL
    // This pattern appears in /data=!3m1!...!1sPLACE_ID:... or similar
    const placeIdMatch = pathname.match(/!1s([^:!]+)/);
    if (placeIdMatch) {
      return placeIdMatch[1];
    }

    // Query parameter: ?place_id=...
    const placeIdParam = parsed.searchParams.get("place_id");
    if (placeIdParam) {
      return placeIdParam;
    }

    // Path-based: /place/PLACE_ID (simple format without data= segment)
    const pathParts = pathname.split("/").filter(Boolean);
    const placeIndex = pathParts.indexOf("place");
    if (placeIndex !== -1 && pathParts[placeIndex + 1]) {
      const candidate = decodeURIComponent(pathParts[placeIndex + 1]);
      // If it looks like a place ID (starts with 0x) return it
      if (candidate.startsWith("0x")) {
        return candidate;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function isValidGoogleMapsUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("google.com") ||
      parsed.hostname.includes("goo.gl") ||
      parsed.hostname.includes("maps.google.com") ||
      parsed.hostname.includes("maps.app.goo.gl")
    );
  } catch {
    return false;
  }
}
