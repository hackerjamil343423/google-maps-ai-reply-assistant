import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/db/schema";
import { claimNextJob, computeBackoff } from "./queue";
import { handleGenerateReply, type GenerateReplyPayload } from "./handlers/generate-reply";
import { handleSyncReviews } from "./handlers/sync-reviews";
import { handlePostReply, type PostReplyPayload } from "./handlers/post-reply";

export async function runNextJob(): Promise<{
  ran: boolean;
  jobId?: string;
  error?: string;
}> {
  const job = await claimNextJob();
  if (!job) return { ran: false };

  try {
    const payload = JSON.parse(job.payload) as Record<string, unknown>;

    if (job.type === "sync_reviews") {
      await handleSyncReviews(job.workspaceId);
    } else if (job.type === "post_reply") {
      await handlePostReply(job.workspaceId, payload as unknown as PostReplyPayload);
    } else if (job.type === "generate_reply") {
      await handleGenerateReply(job.workspaceId, payload as unknown as GenerateReplyPayload);
    }

    if (db) {
      await db
        .update(backgroundJobs)
        .set({ status: "done", finishedAt: new Date() })
        .where(eq(backgroundJobs.id, job.id));
    }

    return { ran: true, jobId: job.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    const shouldRetry = job.attempts < job.maxAttempts;

    if (db) {
      await db
        .update(backgroundJobs)
        .set({
          status: shouldRetry ? "pending" : "failed",
          lastError: message,
          finishedAt: shouldRetry ? null : new Date(),
          runAt: shouldRetry ? computeBackoff(job.attempts) : job.runAt,
        })
        .where(eq(backgroundJobs.id, job.id));
    }

    return { ran: true, jobId: job.id, error: message };
  }
}
