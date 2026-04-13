import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { businesses, reviews } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { and, desc, eq, sql } from "drizzle-orm";

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

  const businessList = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      googleLocationId: businesses.googleLocationId,
      connectedAt: businesses.connectedAt,
      syncedReviewCount: sql<number>`count(${reviews.id})::int`,
    })
    .from(businesses)
    .leftJoin(reviews, eq(reviews.businessId, businesses.id))
    .where(
      and(
        eq(businesses.workspaceId, workspaceId),
        eq(businesses.status, "active")
      )
    )
    .groupBy(
      businesses.id,
      businesses.name,
      businesses.googleLocationId,
      businesses.connectedAt
    )
    .orderBy(desc(businesses.connectedAt));

  return NextResponse.json({
    businesses: businessList,
  });
}
