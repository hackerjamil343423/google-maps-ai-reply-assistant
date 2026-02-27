import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { connectWorkspaceGoogleBusiness } from "@/lib/google/business-profile";
import { ensureWorkspaceForUser } from "@/lib/workspace";

type ConnectErrorAction = "relink_google" | "check_google_setup" | "none";

function classifyConnectError(message: string): {
  status: number;
  action: ConnectErrorAction;
  errorCode: string;
  error: string;
} {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("access token is unavailable") ||
    normalized.includes("not linked")
  ) {
    return {
      status: 401,
      action: "relink_google",
      errorCode: "google_account_not_linked",
      error:
        "Google account access expired or is missing. Please reconnect Google and grant permissions again.",
    };
  }

  if (
    normalized.includes("insufficient authentication scopes") ||
    normalized.includes("insufficient permission") ||
    normalized.includes("does not have permission")
  ) {
    return {
      status: 403,
      action: "relink_google",
      errorCode: "google_scope_missing",
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
      action: "check_google_setup",
      errorCode: "google_api_not_enabled",
      error:
        "Google Business APIs are not fully enabled for this Google Cloud project. Enable required APIs and try again.",
    };
  }

  if (normalized.includes("no google business account found")) {
    return {
      status: 404,
      action: "none",
      errorCode: "no_business_account",
      error:
        "No Google Business account was found for this Google user. Sign in with the account that owns/manages the Business Profile.",
    };
  }

  if (normalized.includes("no google business locations found")) {
    return {
      status: 404,
      action: "none",
      errorCode: "no_business_locations",
      error:
        "No Google Business locations were found. Confirm this account has at least one accessible Business Profile location.",
    };
  }

  return {
    status: 400,
    action: "none",
    errorCode: "google_connect_failed",
    error: message || "Failed to connect Google Business Profile.",
  };
}

export async function POST(req: NextRequest) {
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

  try {
    const business = await connectWorkspaceGoogleBusiness(workspaceId, req.headers);
    return NextResponse.json({ connected: true, business });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to connect Google Business Profile.";

    const classified = classifyConnectError(message);
    return NextResponse.json(
      {
        error: classified.error,
        errorCode: classified.errorCode,
        action: classified.action,
      },
      { status: classified.status }
    );
  }
}
