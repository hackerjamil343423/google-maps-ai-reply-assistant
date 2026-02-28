import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { generateReviewReply } from "@/lib/ai/generate-review-reply";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { aiSettings } from "@/lib/db/schema";
import { getWorkspaceReviewById, saveDraftReplyForReview } from "@/lib/reviews/server";
import { getWorkspaceAccess, incrementUsageCounter } from "@/lib/subscription/server";
import { ensureWorkspaceForUser } from "@/lib/workspace";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
            ? "Your free trial has expired. Please upgrade to continue generating AI replies."
            : "Your subscription is not active. Please renew to use AI replies.",
      },
      { status: 403 }
    );
  }

  const { id } = await params;
  const reviewId = id?.trim();

  if (!reviewId) {
    return NextResponse.json({ error: "Invalid review id." }, { status: 400 });
  }

  const review = await getWorkspaceReviewById(workspaceId, reviewId);
  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  const payload = await req.json().catch(() => null);
  const customPrompt =
    typeof payload?.customPrompt === "string"
      ? payload.customPrompt.trim()
      : undefined;

  const savedSettings = await db.query.aiSettings.findFirst({
    where: eq(aiSettings.workspaceId, workspaceId),
    columns: { prompt: true, tone: true },
  });

  const generated = await generateReviewReply({
    review: review.text,
    reviewerName: review.authorName,
    starRating: review.rating,
    businessName: review.businessName,
    tone: savedSettings?.tone,
    customPrompt: customPrompt || savedSettings?.prompt,
  });

  const draft = await saveDraftReplyForReview({
    reviewId,
    content: generated.reply,
    source: "ai",
    userId: session.user.id,
  });

  if (!draft) {
    return NextResponse.json(
      { error: "Failed to save draft reply." },
      { status: 500 }
    );
  }

  // Increment usage counter (fire-and-forget — don't block response)
  void incrementUsageCounter(workspaceId, "aiRepliesGenerated");

  return NextResponse.json({
    reply: draft.content,
    source: generated.source,
    replySource: draft.source,
    status: draft.status,
    replyId: draft.id,
  });
}
