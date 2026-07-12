import { eq } from "drizzle-orm";

import { generateReviewReply } from "@/lib/ai/generate-review-reply";
import { recordReplyEvent } from "@/lib/analytics/reply-events";
import { db } from "@/lib/db";
import { aiSettings, businesses, reviews } from "@/lib/db/schema";
import {
  getGoogleAccessTokenForWorkspace,
  postGoogleReviewReplyWithToken,
} from "@/lib/google/business-profile";
import {
  markReplyFailed,
  markReplyPosted,
  saveDraftReplyForReview,
} from "@/lib/reviews/server";
import { incrementUsageCounter } from "@/lib/subscription/server";
import { computeBackoff, enqueueJob } from "../queue";

export interface GenerateReplyPayload {
  reviewId: string;
}

export async function handleGenerateReply(
  workspaceId: string,
  payload: GenerateReplyPayload
): Promise<void> {
  if (!db) throw new Error("DB unavailable.");

  const { reviewId } = payload;

  // Load review with business name
  const reviewRow = await db
    .select({
      id: reviews.id,
      googleReviewId: reviews.googleReviewId,
      authorName: reviews.authorName,
      rating: reviews.rating,
      text: reviews.text,
      businessName: businesses.name,
    })
    .from(reviews)
    .innerJoin(businesses, eq(businesses.id, reviews.businessId))
    .where(eq(reviews.id, reviewId))
    .limit(1);

  const review = reviewRow[0];
  if (!review) throw new Error(`Review ${reviewId} not found.`);

  const settings = await db.query.aiSettings.findFirst({
    where: eq(aiSettings.workspaceId, workspaceId),
    columns: { prompt: true, tone: true, approvalMode: true },
  });

  const generated = await generateReviewReply({
    review: review.text,
    reviewerName: review.authorName,
    starRating: review.rating,
    businessName: review.businessName,
    tone: settings?.tone,
    customPrompt: settings?.prompt,
  });

  const draft = await saveDraftReplyForReview({
    reviewId,
    content: generated.reply,
    source: "ai",
    userId: null,
  });

  if (!draft) throw new Error("Failed to save draft reply.");

  await incrementUsageCounter(workspaceId, "aiRepliesGenerated");
  await recordReplyEvent({
    workspaceId,
    reviewId,
    replyId: draft.id,
    eventType: "generated",
    tone: settings?.tone,
    rating: review.rating,
  });

  const approvalMode = settings?.approvalMode ?? "auto";
  if (approvalMode === "auto" && review.googleReviewId) {
    const accessToken = await getGoogleAccessTokenForWorkspace(workspaceId);
    if (!accessToken) throw new Error("Google access token unavailable.");

    try {
      await postGoogleReviewReplyWithToken(
        accessToken,
        review.googleReviewId,
        draft.content
      );
      await markReplyPosted({
        reviewId,
        replyId: draft.id,
        content: draft.content,
        source: "ai",
        userId: null,
      });
      await incrementUsageCounter(workspaceId, "reviewsManaged");
      await recordReplyEvent({
        workspaceId,
        reviewId,
        replyId: draft.id,
        eventType: "posted_direct",
        tone: settings?.tone,
        wasEdited: false,
        rating: review.rating,
      });
    } catch {
      // Mark failed and let the post_reply job own retrying this exact row.
      await markReplyFailed(draft.id);
      await enqueueJob({
        workspaceId,
        type: "post_reply",
        payload: { reviewId, replyId: draft.id },
        runAt: computeBackoff(1),
        maxAttempts: 3,
      });
      return;
    }
  }
}
