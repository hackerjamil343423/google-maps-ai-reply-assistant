import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { account, businesses, reviewReplies, reviews, workspaces } from "@/lib/db/schema";

const GOOGLE_ACCOUNTS_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
const GOOGLE_BUSINESS_INFO_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const GOOGLE_MY_BUSINESS_V4_BASE = "https://mybusiness.googleapis.com/v4";

export const GOOGLE_BUSINESS_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
];

export type GoogleAccountLinkStatus = {
  linked: boolean;
  grantedScopes: string[];
  hasRequiredScopes: boolean;
};

interface GoogleAccountsResponse {
  accounts?: Array<{
    name?: string;
  }>;
}

interface GoogleLocationsResponse {
  locations?: Array<{
    name?: string;
    title?: string;
  }>;
}

interface GoogleLocationDetailsResponse {
  title?: string;
  metadata?: {
    placeId?: string;
    newReviewUri?: string;
  };
}

interface GoogleReviewsResponse {
  reviews?: Array<{
    name?: string;
    reviewId?: string;
    starRating?: string;
    comment?: string;
    createTime?: string;
    updateTime?: string;
    reviewer?: {
      displayName?: string;
    };
    reviewReply?: {
      comment?: string;
      updateTime?: string;
    };
  }>;
  nextPageToken?: string;
}

interface GoogleApiErrorBody {
  error?: {
    message?: string;
  };
}

export interface GoogleBusinessConnection {
  businessId: string;
  businessName: string;
  googleLocationId: string;
}

export interface GoogleLocationOption {
  googleLocationId: string;
  title: string;
}

export interface SyncWorkspaceReviewsResult {
  business: GoogleBusinessConnection;
  synced: number;
  newReviewIds: string[];
}

export interface WorkspaceReviewLinkResult {
  businessName: string;
  reviewLink: string;
  placeId: string | null;
}

function normalizeGoogleLocationName(accountName: string, locationName: string) {
  if (locationName.startsWith("accounts/")) {
    return locationName;
  }
  return `${accountName}/${locationName}`;
}

function toBusinessInfoLocationName(locationName: string) {
  if (locationName.startsWith("locations/")) {
    return locationName;
  }

  const marker = "/locations/";
  const markerIndex = locationName.indexOf(marker);
  if (markerIndex >= 0) {
    return `locations/${locationName.slice(markerIndex + marker.length)}`;
  }

  return locationName;
}

function buildGoogleMapsPlaceUrl(placeId: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    "Google"
  )}&query_place_id=${encodeURIComponent(placeId)}`;
}

function buildGoogleWriteReviewUrl(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

function normalizeGoogleReviewName(locationName: string, review: { name?: string; reviewId?: string }) {
  if (review.name?.startsWith("accounts/")) {
    return review.name;
  }
  if (review.reviewId) {
    return `${locationName}/reviews/${review.reviewId}`;
  }
  return null;
}

function mapStarRating(value: string | undefined) {
  if (value === "ONE") return 1;
  if (value === "TWO") return 2;
  if (value === "THREE") return 3;
  if (value === "FOUR") return 4;
  if (value === "FIVE") return 5;
  return 5;
}

function extractOriginalReviewText(comment: string | undefined): string {
  if (!comment) return "";
  const text = comment.trim();
  // Google prepends "(Translated by Google) ...\n\n(Original)\n<original text>"
  const originalMarker = /(^|\n)\(Original\)\n/;
  const match = originalMarker.exec(text);
  if (match) {
    return text.slice(match.index + match[0].length).trim();
  }
  // If only the translated prefix exists with no "(Original)" block, strip the prefix
  if (text.startsWith("(Translated by Google)")) {
    return text.replace(/^\(Translated by Google\)\s*/, "").trim();
  }
  return text;
}

function toDate(value: string | undefined) {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

function extractGoogleErrorMessage(body: unknown) {
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (trimmed) return trimmed;
    return "Google API request failed.";
  }

  if (!body || typeof body !== "object") {
    return "Google API request failed.";
  }
  const errorBody = body as GoogleApiErrorBody;
  return errorBody.error?.message || "Google API request failed.";
}

async function googleApiFetch<T>(
  url: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    let parsedBody: unknown = text;
    try {
      parsedBody = JSON.parse(text);
    } catch {
      // Keep raw text fallback.
    }
    throw new Error(extractGoogleErrorMessage(parsedBody));
  }

  return (await res.json()) as T;
}

async function getGoogleAccessTokenFromHeaders(headers: Headers): Promise<string | null> {
  try {
    const tokenResponse = (await auth.api.getAccessToken({
      headers,
      body: {
        providerId: "google",
      },
    })) as { accessToken?: string };

    const token = tokenResponse.accessToken?.trim();
    return token || null;
  } catch {
    return null;
  }
}

function parseGrantedScopes(scopeValue: string | null | undefined) {
  if (!scopeValue) return [];
  return scopeValue
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export async function getGoogleAccountLinkStatus(
  userId: string
): Promise<GoogleAccountLinkStatus> {
  if (!db) {
    return {
      linked: false,
      grantedScopes: [],
      hasRequiredScopes: false,
    };
  }

  const linked = await db.query.account.findFirst({
    where: and(eq(account.userId, userId), eq(account.providerId, "google")),
    columns: { id: true, scope: true },
  });

  const grantedScopes = parseGrantedScopes(linked?.scope);
  const hasRequiredScopes = GOOGLE_BUSINESS_SCOPES.every((scope) =>
    grantedScopes.includes(scope)
  );

  return {
    linked: Boolean(linked),
    grantedScopes,
    hasRequiredScopes,
  };
}

export async function hasLinkedGoogleAccount(userId: string) {
  const status = await getGoogleAccountLinkStatus(userId);
  return status.linked;
}

export async function listWorkspaceGoogleLocations(
  headers: Headers
): Promise<GoogleLocationOption[]> {
  const accessToken = await getGoogleAccessTokenFromHeaders(headers);
  if (!accessToken) {
    throw new Error("Google account is not linked or access token is unavailable.");
  }

  const accountsRes = await googleApiFetch<GoogleAccountsResponse>(
    `${GOOGLE_ACCOUNTS_BASE}/accounts`,
    accessToken
  );

  const googleAccount = accountsRes.accounts?.find((item) => item.name);
  if (!googleAccount?.name) {
    throw new Error("No Google Business account found for this user.");
  }

  const locationQuery = new URLSearchParams({
    readMask: "name,title",
    pageSize: "20",
  });

  const locationsRes = await googleApiFetch<GoogleLocationsResponse>(
    `${GOOGLE_BUSINESS_INFO_BASE}/${googleAccount.name}/locations?${locationQuery.toString()}`,
    accessToken
  );

  return (locationsRes.locations ?? [])
    .filter((item) => item.name)
    .map((item) => ({
      googleLocationId: normalizeGoogleLocationName(googleAccount.name!, item.name!),
      title: item.title?.trim() || "Google Business Profile",
    }));
}

export async function connectWorkspaceGoogleBusiness(
  workspaceId: string,
  headers: Headers,
  preferredLocationId?: string,
  mode: "update" | "add" = "update"
): Promise<GoogleBusinessConnection> {
  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const accessToken = await getGoogleAccessTokenFromHeaders(headers);
  if (!accessToken) {
    throw new Error("Google account is not linked or access token is unavailable.");
  }

  const accountsRes = await googleApiFetch<GoogleAccountsResponse>(
    `${GOOGLE_ACCOUNTS_BASE}/accounts`,
    accessToken
  );

  const googleAccount = accountsRes.accounts?.find((item) => item.name);
  if (!googleAccount?.name) {
    throw new Error("No Google Business account found for this user.");
  }

  const locationQuery = new URLSearchParams({
    readMask: "name,title",
    pageSize: "20",
  });

  const locationsRes = await googleApiFetch<GoogleLocationsResponse>(
    `${GOOGLE_BUSINESS_INFO_BASE}/${googleAccount.name}/locations?${locationQuery.toString()}`,
    accessToken
  );

  const rawLocations = locationsRes.locations?.filter((item) => item.name) ?? [];
  if (rawLocations.length === 0) {
    throw new Error("No Google Business locations found.");
  }

  const location = preferredLocationId
    ? (rawLocations.find(
        (item) =>
          normalizeGoogleLocationName(googleAccount.name!, item.name!) ===
          preferredLocationId
      ) ?? rawLocations[0])
    : rawLocations[0];

  const locationName = normalizeGoogleLocationName(googleAccount.name, location.name!);
  const businessName = location.title?.trim() || "Google Business Profile";

  let businessId: string | undefined;

  if (mode === "add") {
    // Insert a new business record (multi-location: add another profile)
    const [created] = await db
      .insert(businesses)
      .values({
        workspaceId,
        name: businessName,
        googleLocationId: locationName,
        status: "active",
        connectedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [businesses.workspaceId, businesses.googleLocationId],
        set: {
          name: businessName,
          status: "active",
          connectedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning({ id: businesses.id });
    businessId = created?.id;
  } else {
    // Update the first existing business record (change location)
    const existing = await db.query.businesses.findFirst({
      where: eq(businesses.workspaceId, workspaceId),
      orderBy: [desc(businesses.createdAt)],
    });

    if (existing?.id) {
      await db
        .update(businesses)
        .set({
          name: businessName,
          googleLocationId: locationName,
          status: "active",
          connectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(businesses.id, existing.id));
      businessId = existing.id;
    } else {
      const [created] = await db
        .insert(businesses)
        .values({
          workspaceId,
          name: businessName,
          googleLocationId: locationName,
          status: "active",
          connectedAt: new Date(),
        })
        .returning({ id: businesses.id });
      businessId = created?.id;
    }
  }

  if (!businessId) {
    throw new Error("Unable to persist Google Business connection.");
  }

  return {
    businessId,
    businessName,
    googleLocationId: locationName,
  };
}

export async function syncWorkspaceReviewsFromAccessToken(
  workspaceId: string,
  accessToken: string,
  businessId?: string
): Promise<SyncWorkspaceReviewsResult> {
  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const business =
    (await db.query.businesses.findFirst({
      where: and(
        eq(businesses.workspaceId, workspaceId),
        eq(businesses.status, "active"),
        ...(businessId ? [eq(businesses.id, businessId)] : [])
      ),
      orderBy: [desc(businesses.updatedAt)],
    })) ?? null;

  if (!business?.googleLocationId) {
    throw new Error("No active Google Business connection found for this workspace.");
  }

  const connectedBusiness = {
    businessId: business.id,
    businessName: business.name,
    googleLocationId: business.googleLocationId,
  };

  const reviewQuery = new URLSearchParams({
    pageSize: "50",
    orderBy: "updateTime desc",
  });

  let synced = 0;
  const allNewReviewIds: string[] = [];
  let pageToken: string | undefined;
  let totalPages = 0;
  const MAX_PAGES = 20; // Safety limit: 20 pages × 50 = 1000 reviews max

  do {
    if (pageToken) {
      reviewQuery.set("pageToken", pageToken);
    }

    const reviewsRes = await googleApiFetch<GoogleReviewsResponse>(
      `${GOOGLE_MY_BUSINESS_V4_BASE}/${connectedBusiness.googleLocationId}/reviews?${reviewQuery.toString()}`,
      accessToken
    );

    const remoteReviews = reviewsRes.reviews ?? [];
    pageToken = reviewsRes.nextPageToken;
    totalPages += 1;

    // Filter to reviews with a valid Google review ID
    const validReviews = remoteReviews
      .map((r) => ({
        raw: r,
        name: normalizeGoogleReviewName(connectedBusiness.googleLocationId, r),
      }))
      .filter((r): r is { raw: typeof r.raw; name: string } => r.name !== null);

    if (validReviews.length === 0) {
      continue;
    }

    // Batch upsert all reviews in this page — 1 query instead of N
    // xmax = 0 means the row was newly inserted (not an update conflict)
    const savedReviews = await db
      .insert(reviews)
      .values(
        validReviews.map(({ raw, name }) => ({
          businessId: connectedBusiness.businessId,
          googleReviewId: name,
          authorName: raw.reviewer?.displayName?.trim() || "Anonymous",
          rating: mapStarRating(raw.starRating),
          text: extractOriginalReviewText(raw.comment),
          reviewedAt: toDate(raw.updateTime ?? raw.createTime),
          syncedAt: new Date(),
        }))
      )
      .onConflictDoUpdate({
        target: reviews.googleReviewId,
        set: {
          authorName: sql`excluded.author_name`,
          rating: sql`excluded.rating`,
          text: sql`excluded.text`,
          reviewedAt: sql`excluded.reviewed_at`,
          syncedAt: sql`excluded.synced_at`,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        id: reviews.id,
        googleReviewId: reviews.googleReviewId,
        isNew: sql<boolean>`(xmax = 0)`,
      });

    synced += savedReviews.length;
    allNewReviewIds.push(
      ...savedReviews.filter((r) => r.isNew).map((r) => r.id)
    );

    // Collect reviews that have a remote reply attached
    const idByReviewName = new Map(savedReviews.map((r) => [r.googleReviewId, r.id]));
    const reviewsWithReplies = validReviews
      .map(({ raw, name }) => ({
        savedId: idByReviewName.get(name),
        replyText: raw.reviewReply?.comment?.trim(),
        replyPostedAt: toDate(raw.reviewReply?.updateTime),
      }))
      .filter(
        (r): r is { savedId: string; replyText: string; replyPostedAt: Date } =>
          !!r.savedId && !!r.replyText
      );

    if (reviewsWithReplies.length > 0) {
      const reviewIds = reviewsWithReplies.map((r) => r.savedId);

      // Single query to find all existing replies for this batch
      const existingReplies = await db
        .select({ id: reviewReplies.id, reviewId: reviewReplies.reviewId })
        .from(reviewReplies)
        .where(inArray(reviewReplies.reviewId, reviewIds));

      const existingByReviewId = new Map(existingReplies.map((r) => [r.reviewId, r.id]));

      const toInsert: (typeof reviewReplies.$inferInsert)[] = [];

      for (const { savedId, replyText, replyPostedAt } of reviewsWithReplies) {
        const existingId = existingByReviewId.get(savedId);
        if (existingId) {
          await db
            .update(reviewReplies)
            .set({ content: replyText, source: "manual", status: "posted", postedAt: replyPostedAt, updatedAt: new Date() })
            .where(eq(reviewReplies.id, existingId));
        } else {
          toInsert.push({ reviewId: savedId, content: replyText, source: "manual", status: "posted", postedAt: replyPostedAt });
        }
      }

      // Batch insert all new replies — 1 query instead of N
      if (toInsert.length > 0) {
        await db.insert(reviewReplies).values(toInsert);
      }
    }

    // Small delay between pages to respect rate limits
    if (pageToken && totalPages < MAX_PAGES) {
      await new Promise((r) => setTimeout(r, 300));
    }
  } while (pageToken && totalPages < MAX_PAGES);

  return {
    business: connectedBusiness,
    synced,
    newReviewIds: allNewReviewIds,
  };
}

export async function syncWorkspaceReviewsFromGoogle(
  workspaceId: string,
  headers: Headers,
  businessId?: string
): Promise<SyncWorkspaceReviewsResult> {
  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  // Ensure business connection exists (connects if missing)
  const business = await db.query.businesses.findFirst({
    where: and(
      eq(businesses.workspaceId, workspaceId),
      eq(businesses.status, "active")
    ),
    orderBy: [desc(businesses.updatedAt)],
  });

  if (!business?.googleLocationId) {
    await connectWorkspaceGoogleBusiness(workspaceId, headers);
  }

  const accessToken = await getGoogleAccessTokenForWorkspace(workspaceId);
  if (!accessToken) {
    throw new Error("Google account is not linked or access token is unavailable.");
  }

  return syncWorkspaceReviewsFromAccessToken(workspaceId, accessToken, businessId);
}

export async function postGoogleReviewReplyWithToken(
  accessToken: string,
  reviewResourceName: string,
  content: string
) {
  await googleApiFetch(
    `${GOOGLE_MY_BUSINESS_V4_BASE}/${reviewResourceName}/reply`,
    accessToken,
    {
      method: "PUT",
      body: JSON.stringify({ comment: content }),
    }
  );
}

export async function postGoogleReviewReply(
  headers: Headers,
  reviewResourceName: string,
  content: string
) {
  const accessToken = await getGoogleAccessTokenFromHeaders(headers);
  if (!accessToken) {
    throw new Error("Google account is not linked or access token is unavailable.");
  }

  await postGoogleReviewReplyWithToken(accessToken, reviewResourceName, content);
}

export async function postWorkspaceGoogleReviewReply(
  workspaceId: string,
  reviewResourceName: string,
  content: string
) {
  const accessToken = await getGoogleAccessTokenForWorkspace(workspaceId);
  if (!accessToken) {
    throw new Error("Google account is not linked or access token is unavailable.");
  }

  await postGoogleReviewReplyWithToken(accessToken, reviewResourceName, content);
}

async function refreshGoogleAccessToken(
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const { env } = await import("@/lib/env");
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) return null;

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);

  if (db) {
    await db
      .update(account)
      .set({
        accessToken: data.access_token,
        accessTokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(
        and(eq(account.userId, userId), eq(account.providerId, "google"))
      );
  }

  return data.access_token;
}

export async function getGoogleAccessTokenForWorkspace(
  workspaceId: string
): Promise<string | null> {
  if (!db) return null;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { ownerUserId: true },
  });
  if (!workspace) return null;

  const googleAccount = await db.query.account.findFirst({
    where: and(
      eq(account.userId, workspace.ownerUserId),
      eq(account.providerId, "google")
    ),
    columns: {
      accessToken: true,
      accessTokenExpiresAt: true,
      refreshToken: true,
      userId: true,
    },
  });

  if (!googleAccount?.accessToken) return null;

  const isExpired =
    googleAccount.accessTokenExpiresAt != null &&
    googleAccount.accessTokenExpiresAt < new Date();

  if (!isExpired) return googleAccount.accessToken;

  if (!googleAccount.refreshToken) return null;

  return refreshGoogleAccessToken(
    googleAccount.userId,
    googleAccount.refreshToken
  );
}

export async function getWorkspaceGoogleReviewLink(
  workspaceId: string,
  headers: Headers,
  businessId?: string
): Promise<WorkspaceReviewLinkResult> {
  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const business = await db.query.businesses.findFirst({
    where: and(
      eq(businesses.workspaceId, workspaceId),
      eq(businesses.status, "active"),
      ...(businessId ? [eq(businesses.id, businessId)] : [])
    ),
    orderBy: [desc(businesses.updatedAt)],
    columns: {
      name: true,
      googleLocationId: true,
    },
  });

  if (!business?.googleLocationId) {
    throw new Error("No connected Google Business Profile found.");
  }

  const accessToken = await getGoogleAccessTokenForWorkspace(workspaceId);
  if (!accessToken) {
    throw new Error("Google account is not linked or access token is unavailable.");
  }

  const readMask = new URLSearchParams({
    readMask: "title,metadata.placeId,metadata.newReviewUri",
  });
  const businessInfoLocationName = toBusinessInfoLocationName(
    business.googleLocationId
  );

  const location = await googleApiFetch<GoogleLocationDetailsResponse>(
    `${GOOGLE_BUSINESS_INFO_BASE}/${businessInfoLocationName}?${readMask.toString()}`,
    accessToken
  );

  const placeId = location.metadata?.placeId?.trim() || null;
  const newReviewUri = location.metadata?.newReviewUri?.trim() || "";
  const reviewLink =
    newReviewUri || (placeId ? buildGoogleWriteReviewUrl(placeId) : "");

  if (!reviewLink) {
    throw new Error("Google review link is not available for this business yet.");
  }

  return {
    businessName: location.title?.trim() || business.name,
    reviewLink,
    placeId,
  };
}
