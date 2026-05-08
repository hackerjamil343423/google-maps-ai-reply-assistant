import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { adminGuard, getRequestAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import { reviewReplies, reviews } from "@/lib/db/schema";
import { logAdminAction } from "@/lib/admin-queries";

export const GET = adminGuard(async (_req, ctx) => {
  const { reviewId } = await ctx.params;
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const [reply] = await db
    .select()
    .from(reviewReplies)
    .where(eq(reviewReplies.reviewId, reviewId))
    .limit(1);

  return NextResponse.json({ reply: reply ?? null });
});

export const PATCH = adminGuard(async (req, ctx) => {
  const { reviewId } = await ctx.params;
  const body = await req.json();
  const session = await getRequestAdminSession(req);

  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  if (!body.content || typeof body.content !== "string") {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(reviewReplies)
    .where(eq(reviewReplies.reviewId, reviewId))
    .limit(1);

  if (existing) {
    await db
      .update(reviewReplies)
      .set({ content: body.content.trim(), updatedAt: new Date() })
      .where(eq(reviewReplies.reviewId, reviewId));
    await logAdminAction(session!.user.id, "edit_review_reply", "review_reply", reviewId);
  } else {
    await db.insert(reviewReplies).values({
      reviewId,
      content: body.content.trim(),
      source: "manual",
      status: "approved",
    });
    await logAdminAction(session!.user.id, "create_review_reply", "review_reply", reviewId);
  }

  return NextResponse.json({ success: true });
});

export const DELETE = adminGuard(async (req, ctx) => {
  const { reviewId } = await ctx.params;
  const session = await getRequestAdminSession(req);

  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  await db.delete(reviewReplies).where(eq(reviewReplies.reviewId, reviewId));
  await logAdminAction(session!.user.id, "delete_review_reply", "review_reply", reviewId);

  return NextResponse.json({ success: true });
});
