import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { backgroundJobs, businesses } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { enqueueJob } from "@/lib/jobs/queue";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
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

  let enqueued = 0;

  for (const workspaceId of uniqueWorkspaceIds) {
    // Skip if a pending sync job already exists for this workspace
    const existing = await db.query.backgroundJobs.findFirst({
      where: and(
        eq(backgroundJobs.workspaceId, workspaceId),
        eq(backgroundJobs.type, "sync_reviews"),
        eq(backgroundJobs.status, "pending")
      ),
      columns: { id: true },
    });

    if (!existing) {
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
