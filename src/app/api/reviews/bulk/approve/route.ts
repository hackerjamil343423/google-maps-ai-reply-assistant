import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { postGoogleReviewReply } from "@/lib/google/business-profile";
import {
  getLatestReplyForReview,
  getWorkspaceReviewById,
  markReplyPosted,
} from "@/lib/reviews/server";
import { ensureWorkspaceForUser } from "@/lib/workspace";

const bulkApproveSchema = z.object({
  reviewIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  const workspaceId = await ensureWorkspaceForUser(
    session.user.id,
    session.user.name
  );

  if (!workspaceId) {
    return NextResponse.json(
      { error: "Unable to initialize workspace." },
      { status: 500 }
    );
  }

  const parsed = bulkApproveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const reviewIds = Array.from(
    new Set(
      parsed.data.reviewIds
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );

  let approved = 0;
  const failed: Array<{ reviewId: string; error: string }> = [];

  for (const reviewId of reviewIds) {
    const review = await getWorkspaceReviewById(workspaceId, reviewId);
    if (!review) {
      failed.push({ reviewId, error: "Review not found." });
      continue;
    }

    if (!review.googleReviewId) {
      failed.push({
        reviewId,
        error: "Review is not linked to Google Business Profile.",
      });
      continue;
    }

    const latestReply = await getLatestReplyForReview(reviewId);
    const content = latestReply?.content?.trim() || "";
    const source = latestReply?.source ?? "manual";

    if (!content) {
      failed.push({ reviewId, error: "No draft reply to approve." });
      continue;
    }

    try {
      await postGoogleReviewReply(req.headers, review.googleReviewId, content);
      await markReplyPosted({
        reviewId,
        content,
        source,
        userId: session.user.id,
      });
      approved += 1;
    } catch (error) {
      failed.push({
        reviewId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to post reply to Google Business Profile.",
      });
    }
  }

  return NextResponse.json({
    approved,
    failed,
    total: reviewIds.length,
  });
}
