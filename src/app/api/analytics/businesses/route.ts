import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api/session";
import { getAccessibleBusinessIds } from "@/lib/business-access";
import { db } from "@/lib/db";
import { businesses, reviews } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
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

    const accessibleBusinessIds = await getAccessibleBusinessIds(
      workspaceId,
      session.user.id
    );
    if (accessibleBusinessIds.length === 0) {
      return NextResponse.json({ businesses: [] });
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
          eq(businesses.status, "active"),
          inArray(businesses.id, accessibleBusinessIds)
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
  } catch (error) {
    console.error("[analytics/businesses] failed to load businesses", error);
    return NextResponse.json(
      { error: "Failed to load business profiles" },
      { status: 500 }
    );
  }
}
