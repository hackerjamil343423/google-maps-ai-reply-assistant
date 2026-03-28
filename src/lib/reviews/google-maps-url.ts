/**
 * Parses a Google Maps URL and extracts the place ID or search query.
 * Supports:
 * - https://www.google.com/maps/place/.../@.../data=...!3m1!4b1!4m6!...
 * - https://www.google.com/maps/search/.../@.../data=...!1s...!4m...!8m...!11s...
 * - https://maps.app.goo.gl/... (short URL - returns null, needs redirect)
 */
export function extractPlaceIdFromGoogleMapsUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const hash = parsed.hash;

    // Short URL (maps.app.goo.gl) - can't resolve without fetching
    if (
      pathname === "/" &&
      (parsed.hostname.includes("goo.gl") || parsed.hostname.includes("maps.app.goo.gl"))
    ) {
      return null;
    }

    // Place page: /place/Business+Name/data=...!4m6!3m5!...
    // Extract from "data=!4m6!3m5!1sPLACE_ID" pattern in path
    const dataMatch = pathname.match(/\/data=[^!]+!/);
    if (dataMatch) {
      const dataSegment = dataMatch[0];
      // Format: /data=...!...!4m6!3m5!1sPLACE_ID:...
      const placeIdMatch = dataSegment.match(/!1s([^:!]+)/);
      if (placeIdMatch) {
        return placeIdMatch[1];
      }
    }

    // Query parameter: ?place_id=...
    const placeIdParam = parsed.searchParams.get("place_id");
    if (placeIdParam) {
      return placeIdParam;
    }

    // Path-based: /place/PLACE_ID
    // e.g., /place/ChIJ.../...
    const pathParts = pathname.split("/").filter(Boolean);
    const placeIndex = pathParts.indexOf("place");
    if (placeIndex !== -1 && pathParts[placeIndex + 1]) {
      return decodeURIComponent(pathParts[placeIndex + 1]);
    }

    // Search page with place_id in URL (old format)
    const placeIdSearch = parsed.searchParams.get("pasted");
    if (placeIdSearch) {
      return placeIdSearch;
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
