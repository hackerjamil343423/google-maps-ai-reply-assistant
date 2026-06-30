import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { adminGuard, getRequestAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { logAdminAction } from "@/lib/admin-queries";

export const GET = adminGuard(async (_req, ctx) => {
  const { workspaceId } = await ctx.params;
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  return NextResponse.json({ subscription: sub ?? null });
});

export const PATCH = adminGuard(async (req, ctx) => {
  const { workspaceId } = await ctx.params;
  const body = await req.json();
  const session = await getRequestAdminSession(req);

  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const allowedFields = ["plan", "status", "billingInterval", "trialEndsAt", "cancelAtPeriodEnd"] as const;
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db
    .update(subscriptions)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(subscriptions.workspaceId, workspaceId));

  await logAdminAction(session!.user.id, "update_subscription", "subscription", workspaceId, updates);

  return NextResponse.json({ success: true });
});

export const DELETE = adminGuard(async (req, ctx) => {
  const { workspaceId } = await ctx.params;
  const session = await getRequestAdminSession(req);

  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  await db.delete(subscriptions).where(eq(subscriptions.workspaceId, workspaceId));
  await logAdminAction(session!.user.id, "cancel_subscription", "subscription", workspaceId);

  return NextResponse.json({ success: true });
});
