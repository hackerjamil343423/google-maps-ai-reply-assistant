import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { backgroundJobs, businesses } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { enqueueJob } from "@/lib/jobs/queue";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "DB unavailable." }, { status: 503 });
  }

  // Find all workspaces with an active connected business
  const activeBusinesses = await db.query.businesses.findMany({
    where: eq(businesses.status, "active"),
    columns: { workspaceId: true },
  });

  const uniqueWorkspaceIds = [
    ...new Set(activeBusinesses.map((b) => b.workspaceId)),
  ];

  if (uniqueWorkspaceIds.length === 0) {
    return NextResponse.json({ total: 0, enqueued: 0, skipped: 0 });
  }

  // Single query to find all workspace IDs that already have a pending or running sync job
  const alreadyPending = await db
    .select({ workspaceId: backgroundJobs.workspaceId })
    .from(backgroundJobs)
    .where(
      and(
        inArray(backgroundJobs.workspaceId, uniqueWorkspaceIds),
        eq(backgroundJobs.type, "sync_reviews"),
        inArray(backgroundJobs.status, ["pending", "running"])
      )
    );

  const alreadyPendingIds = new Set(alreadyPending.map((j) => j.workspaceId));

  let enqueued = 0;
  for (const workspaceId of uniqueWorkspaceIds) {
    if (!alreadyPendingIds.has(workspaceId)) {
      await enqueueJob({ workspaceId, type: "sync_reviews" });
      enqueued++;
    }
  }

  return NextResponse.json({
    total: uniqueWorkspaceIds.length,
    enqueued,
    skipped: uniqueWorkspaceIds.length - enqueued,
  });
}
