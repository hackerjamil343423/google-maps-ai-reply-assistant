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
import { getWorkspaceAccess, incrementUsageCounter } from "@/lib/subscription/server";
import { ensureWorkspaceForUser } from "@/lib/workspace";

const postReplySchema = z.object({
  content: z.string().trim().min(1).max(4000).optional(),
  source: z.enum(["ai", "manual"]).optional(),
});

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
            ? "Your free trial has expired. Please upgrade to post replies."
            : "Your subscription is not active. Please renew to post replies.",
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

  const parsed = postReplySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const latestReply = await getLatestReplyForReview(reviewId);

  const content = parsed.data.content?.trim() || latestReply?.content?.trim() || "";
  const source = parsed.data.source ?? latestReply?.source ?? "manual";

  if (!content) {
    return NextResponse.json(
      { error: "Reply content is required." },
      { status: 400 }
    );
  }

  if (!review.googleReviewId) {
    return NextResponse.json(
      { error: "Review is not linked to Google Business Profile." },
      { status: 400 }
    );
  }

  try {
    await postGoogleReviewReply(req.headers, review.googleReviewId, content);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to post reply to Google Business Profile.";

    return NextResponse.json({ error: message }, { status: 502 });
  }

  const postedReply = await markReplyPosted({
    reviewId,
    content,
    source,
    userId: session.user.id,
  });

  void incrementUsageCounter(workspaceId, "reviewsManaged");

  return NextResponse.json({
    success: true,
    reply: postedReply,
  });
}
