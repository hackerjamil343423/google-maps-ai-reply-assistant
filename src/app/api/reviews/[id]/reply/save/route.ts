import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { getWorkspaceReviewById, saveDraftReplyForReview } from "@/lib/reviews/server";
import { ensureWorkspaceForUser } from "@/lib/workspace";

const saveReplySchema = z.object({
  content: z.string().trim().min(1).max(4000),
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

  const { id } = await params;
  const reviewId = id?.trim();

  if (!reviewId) {
    return NextResponse.json({ error: "Invalid review id." }, { status: 400 });
  }

  const review = await getWorkspaceReviewById(workspaceId, reviewId, session.user.id);
  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  const parsed = saveReplySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const draft = await saveDraftReplyForReview({
    reviewId,
    content: parsed.data.content,
    source: parsed.data.source ?? "manual",
    userId: session.user.id,
  });

  if (!draft) {
    return NextResponse.json(
      { error: "Failed to save draft reply." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    reply: {
      id: draft.id,
      content: draft.content,
      source: draft.source,
      status: draft.status,
    },
  });
}
