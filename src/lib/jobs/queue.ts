import { and, eq, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/db/schema";

export type JobType = "sync_reviews" | "post_reply" | "generate_reply";

export interface EnqueueJobArgs {
  workspaceId: string;
  type: JobType;
  payload?: Record<string, unknown>;
  runAt?: Date;
  maxAttempts?: number;
}

export async function enqueueJob(args: EnqueueJobArgs) {
  if (!db) return null;

  const [job] = await db
    .insert(backgroundJobs)
    .values({
      workspaceId: args.workspaceId,
      type: args.type,
      payload: JSON.stringify(args.payload ?? {}),
      runAt: args.runAt ?? new Date(),
      maxAttempts: args.maxAttempts ?? 3,
    })
    .returning({ id: backgroundJobs.id });

  return job ?? null;
}

export async function claimNextJob() {
  if (!db) return null;

  // Use a subquery with FOR UPDATE SKIP LOCKED so concurrent workers
  // each claim exactly one job without stomping on each other.
  const [job] = await db
    .update(backgroundJobs)
    .set({
      status: "running",
      startedAt: new Date(),
      attempts: sql`${backgroundJobs.attempts} + 1`,
    })
    .where(
      eq(
        backgroundJobs.id,
        sql`(
          SELECT id FROM background_jobs
          WHERE status = 'pending' AND run_at <= NOW()
          ORDER BY run_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )`
      )
    )
    .returning();

  return job ?? null;
}

/** Requeue jobs stuck in 'running' for more than 30 minutes (orphaned by crashed workers). */
export async function requeueStalledJobs() {
  if (!db) return;
  const staleThreshold = new Date(Date.now() - 30 * 60 * 1000);
  await db.execute(sql`
    UPDATE background_jobs
    SET status = 'pending', started_at = NULL
    WHERE status = 'running'
      AND started_at < ${staleThreshold}
      AND attempts < max_attempts
  `);
}

/** Exponential backoff: 30s → 2min → 8min */
export function computeBackoff(attempts: number): Date {
  const delayMs = Math.min(30_000 * Math.pow(4, attempts - 1), 8 * 60 * 1000);
  return new Date(Date.now() + delayMs);
}
