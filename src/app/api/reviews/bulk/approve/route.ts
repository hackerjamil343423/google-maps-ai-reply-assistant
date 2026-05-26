import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateReviewReply } from "@/lib/ai/generate-review-reply";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { aiSettings, businesses } from "@/lib/db/schema";
import { postGoogleReviewReply } from "@/lib/google/business-profile";
import {
  getLatestReplyForReview,
  getWorkspaceReviewById,
  markReplyPosted,
  saveDraftReplyForReview,
} from "@/lib/reviews/server";
import { getWorkspaceAccess, incrementUsageCounter } from "@/lib/subscription/server";
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

  // Enforce subscription access
  const access = await getWorkspaceAccess(workspaceId);
  if (!access.allowed) {
    return NextResponse.json(
      {
        error:
          access.reason === "trial_expired"
            ? "Your free trial has expired. Please upgrade to post replies."
            : "Your subscription is not active. Please renew to post replies.",
      },
      { status: 403 }
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

  // Load AI settings once for auto-generation of missing drafts
  const workspaceSettings = db
    ? await db.query.aiSettings.findFirst({
        where: eq(aiSettings.workspaceId, workspaceId),
        columns: { prompt: true, tone: true },
      })
    : null;

  let approved = 0;
  const failed: Array<{ reviewId: string; error: string }> = [];

  for (const reviewId of reviewIds) {
    const review = await getWorkspaceReviewById(workspaceId, reviewId, session.user.id);
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

    let content = latestReply?.content?.trim() || "";
    let source: "ai" | "manual" = latestReply?.source ?? "manual";

    // Auto-generate a draft if none exists
    if (!content) {
      try {
        const businessRow = db
          ? await db.query.businesses.findFirst({
              where: eq(businesses.id, review.businessId),
              columns: { name: true },
            })
          : null;

        const generated = await generateReviewReply({
          review: review.text,
          reviewerName: review.authorName,
          starRating: review.rating,
          businessName: businessRow?.name ?? review.businessName,
          tone: workspaceSettings?.tone,
          customPrompt: workspaceSettings?.prompt,
        });

        await saveDraftReplyForReview({
          reviewId,
          content: generated.reply,
          source: "ai",
          userId: session.user.id,
        });

        content = generated.reply;
        source = "ai";
      } catch {
        failed.push({ reviewId, error: "Failed to generate reply." });
        continue;
      }
    }

    if (!content) {
      failed.push({ reviewId, error: "No reply content available." });
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
      void incrementUsageCounter(workspaceId, "reviewsManaged");
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
