import { NextResponse } from "next/server";
import { desc, count, eq } from "drizzle-orm";

import { adminGuard } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import { businesses, workspaces, user, reviews } from "@/lib/db/schema";

export const GET = adminGuard(async () => {
  if (!db) return NextResponse.json({ businesses: [] });

  const rows = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      status: businesses.status,
      connectedAt: businesses.connectedAt,
      workspaceName: workspaces.name,
      ownerEmail: user.email,
    })
    .from(businesses)
    .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
    .innerJoin(user, eq(workspaces.ownerUserId, user.id))
    .orderBy(desc(businesses.createdAt));

  // Get review counts per business
  const reviewCounts = await db
    .select({
      businessId: reviews.businessId,
      count: count(),
    })
    .from(reviews)
    .groupBy(reviews.businessId);

  const countMap = new Map(reviewCounts.map((r) => [r.businessId, r.count]));

  const result = rows.map((r) => ({
    ...r,
    reviewCount: countMap.get(r.id) ?? 0,
  }));

  return NextResponse.json({ businesses: result });
});
