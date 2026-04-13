import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  await db
    .update(businesses)
    .set({
      status: "disconnected",
      googleLocationId: null,
      connectedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(businesses.workspaceId, workspaceId),
        eq(businesses.status, "active")
      )
    );

  return NextResponse.json({ disconnected: true });
}
