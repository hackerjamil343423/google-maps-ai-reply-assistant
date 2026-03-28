import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { and, desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 500 });
  }

  const businessList = await db.query.businesses.findMany({
    where: and(
      eq(businesses.workspaceId, workspaceId),
      eq(businesses.status, "active")
    ),
    columns: {
      id: true,
      name: true,
      googleLocationId: true,
      connectedAt: true,
    },
    orderBy: [desc(businesses.connectedAt)],
  });

  return NextResponse.json({
    businesses: businessList,
  });
}
