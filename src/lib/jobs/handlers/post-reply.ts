import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { reviews, reviewReplies } from "@/lib/db/schema";
import {
  getGoogleAccessTokenForWorkspace,
  postGoogleReviewReplyWithToken,
} from "@/lib/google/business-profile";
import { markReplyPosted } from "@/lib/reviews/server";

export interface PostReplyPayload {
  reviewId: string;
  replyId: string;
}

export async function handlePostReply(
  workspaceId: string,
  payload: PostReplyPayload
): Promise<void> {
  if (!db) throw new Error("DB unavailable.");

  const reply = await db.query.reviewReplies.findFirst({
    where: eq(reviewReplies.id, payload.replyId),
  });
  if (!reply) throw new Error(`Reply ${payload.replyId} not found.`);

  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, payload.reviewId),
    columns: { googleReviewId: true },
  });
  if (!review?.googleReviewId) {
    throw new Error("Review is not linked to Google Business Profile.");
  }

  const accessToken = await getGoogleAccessTokenForWorkspace(workspaceId);
  if (!accessToken) {
    throw new Error("Google access token unavailable for workspace.");
  }

  await postGoogleReviewReplyWithToken(
    accessToken,
    review.googleReviewId,
    reply.content
  );

  await markReplyPosted({
    reviewId: payload.reviewId,
    replyId: payload.replyId,
    content: reply.content,
    source: reply.source,
    userId: null, // system-originated retry
  });
}
