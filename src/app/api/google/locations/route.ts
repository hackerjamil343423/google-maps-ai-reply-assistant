import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { env } from "@/lib/env";
import { listWorkspaceGoogleLocations } from "@/lib/google/business-profile";
import { ensureWorkspaceForUser } from "@/lib/workspace";

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
    const locations = await listWorkspaceGoogleLocations(req.headers);
    return NextResponse.json({ locations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list locations.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
