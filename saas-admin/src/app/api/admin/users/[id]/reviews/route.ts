import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

import { adminGuard, getRequestAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import { reviews, reviewReplies, businesses, workspaceMembers } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export const GET = adminGuard(async (_req, ctx) => {
  const { id } = await ctx.params;
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  // Get all workspace IDs where this user is a member
  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, id));

  const workspaceIds = memberships.map((m) => m.workspaceId);
  if (workspaceIds.length === 0) return NextResponse.json({ reviews: [] });

  // Get all business IDs for those workspaces
  const bizRows = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(inArray(businesses.workspaceId, workspaceIds));

  const businessIds = bizRows.map((b) => b.id);
  if (businessIds.length === 0) return NextResponse.json({ reviews: [] });

  const rows = await db
    .select({
      id: reviews.id,
      authorName: reviews.authorName,
      rating: reviews.rating,
      text: reviews.text,
      reviewedAt: reviews.reviewedAt,
      businessName: businesses.name,
    })
    .from(reviews)
    .innerJoin(businesses, eq(reviews.businessId, businesses.id))
    .where(inArray(reviews.businessId, businessIds))
    .orderBy(desc(reviews.reviewedAt))
    .limit(50);

  return NextResponse.json({ reviews: rows });
});
