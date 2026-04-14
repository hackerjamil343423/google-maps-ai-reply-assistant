import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getWorkspaceGoogleReviewLink } from "@/lib/google/business-profile";
import { getWorkspaceAccess } from "@/lib/subscription/server";
import { ensureWorkspaceForUser } from "@/lib/workspace";

function classifyReviewLinkError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("access token is unavailable") ||
    normalized.includes("not linked")
  ) {
    return {
      status: 401,
      error:
        "Google account access expired or is missing. Please reconnect Google and grant permissions again.",
    };
  }

  if (normalized.includes("no connected google business profile")) {
    return {
      status: 404,
      error:
        "No connected Google Business Profile found. Connect your business first.",
    };
  }

  if (
    normalized.includes("insufficient authentication scopes") ||
    normalized.includes("insufficient permission") ||
    normalized.includes("does not have permission")
  ) {
    return {
      status: 403,
      error:
        "Google Business permission is missing. Please reconnect Google and approve Business Profile access.",
    };
  }

  if (
    normalized.includes("has not been used in project") ||
    normalized.includes("api has not been used") ||
    normalized.includes("is disabled")
  ) {
    return {
      status: 424,
      error:
        "Google Business APIs are not fully enabled for this Google Cloud project. Enable required APIs and try again.",
    };
  }

  if (normalized.includes("review link is not available")) {
    return {
      status: 424,
      error:
        "Google did not return a review link for this business yet.",
    };
  }

  return {
    status: 400,
    error: message || "Failed to load Google review link.",
  };
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Google OAuth is not configured." },
      { status: 503 }
    );
  }

  if (!db) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  const workspaceId = await ensureWorkspaceForUser(
    session.user.id,
    session.user.name
  );

  if (!workspaceId) {
    return NextResponse.json(
      { error: "Unable to initialize workspace." },
      { status: 500 }
    );
  }

  const access = await getWorkspaceAccess(workspaceId);
  if (!access.allowed) {
    return NextResponse.json(
      {
        error:
          access.reason === "trial_expired"
            ? "Your free trial has expired. Please upgrade to a paid plan."
            : "Your subscription is not active.",
        errorCode: "subscription_required",
      },
      { status: 403 }
    );
  }

  const businessId = req.nextUrl.searchParams.get("businessId") || undefined;

  try {
    const data = await getWorkspaceGoogleReviewLink(workspaceId, req.headers, businessId);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Google review link.";
    const classified = classifyReviewLinkError(message);
    return NextResponse.json(
      { error: classified.error },
      { status: classified.status }
    );
  }
}
