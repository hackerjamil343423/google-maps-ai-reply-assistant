import { and, eq, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/db/schema";

export type JobType = "sync_reviews" | "post_reply";

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

  const [job] = await db
    .update(backgroundJobs)
    .set({
      status: "running",
      startedAt: new Date(),
      attempts: sql`${backgroundJobs.attempts} + 1`,
    })
    .where(
      and(
        eq(backgroundJobs.status, "pending"),
        lte(backgroundJobs.runAt, new Date())
      )
    )
    .returning();

  return job ?? null;
}

/** Exponential backoff: 30s → 2min → 8min */
export function computeBackoff(attempts: number): Date {
  const delayMs = Math.min(30_000 * Math.pow(4, attempts - 1), 8 * 60 * 1000);
  return new Date(Date.now() + delayMs);
}
