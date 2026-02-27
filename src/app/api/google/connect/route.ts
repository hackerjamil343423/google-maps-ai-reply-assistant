import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { connectWorkspaceGoogleBusiness } from "@/lib/google/business-profile";
import { ensureWorkspaceForUser } from "@/lib/workspace";

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
    const message = error instanceof Error ? error.message : "Failed to connect Google Business Profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
