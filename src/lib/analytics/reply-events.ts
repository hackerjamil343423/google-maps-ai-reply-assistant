import { db } from "@/lib/db";
import { replyAnalyticsEvents } from "@/lib/db/schema";

export type ReplyEventType =
  | "generated"
  | "edited"
  | "rejected"
  | "posted_direct"
  | "posted_edited";

export async function recordReplyEvent(args: {
  workspaceId: string;
  reviewId: string;
  replyId?: string | null;
  eventType: ReplyEventType;
  tone?: string;
  wasEdited?: boolean;
  timeToPostMs?: number;
  rating?: number;
}) {
  if (!db) return;
  // Fire-and-forget — never block the main response
  db.insert(replyAnalyticsEvents)
    .values({
      workspaceId: args.workspaceId,
      reviewId: args.reviewId,
      replyId: args.replyId ?? null,
      eventType: args.eventType,
      tone: args.tone ?? null,
      wasEdited: args.wasEdited ?? null,
      timeToPostMs: args.timeToPostMs ?? null,
      rating: args.rating ?? null,
    })
    .catch(() => {
      // Intentionally swallowed — analytics must never break the main flow
    });
}
