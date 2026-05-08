import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { adminGuard } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { getUserDetail, logAdminAction } from "@/lib/admin-queries";

export const GET = adminGuard(async (req, ctx) => {
  const { id } = await ctx.params;
  const detail = await getUserDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ user: detail });
});

export const PATCH = adminGuard(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const session = await import("@/lib/auth/admin-session").then((m) =>
    m.getRequestAdminSession(req)
  );

  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.suspended === "boolean") updates.suspended = body.suspended;
  if (typeof body.isAdmin === "boolean") updates.isAdmin = body.isAdmin;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db
    .update(user)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(user.id, id));

  await logAdminAction(session!.user.id, "update_user", "user", id, updates);

  return NextResponse.json({ success: true });
});

export const DELETE = adminGuard(async (req, ctx) => {
  const { id } = await ctx.params;
  const session = await import("@/lib/auth/admin-session").then((m) =>
    m.getRequestAdminSession(req)
  );

  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  await db.delete(user).where(eq(user.id, id));
  await logAdminAction(session!.user.id, "delete_user", "user", id);

  return NextResponse.json({ success: true });
});
