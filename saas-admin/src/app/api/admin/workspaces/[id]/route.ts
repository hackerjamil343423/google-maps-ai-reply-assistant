import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { adminGuard, getRequestAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { getWorkspaceDetail, logAdminAction } from "@/lib/admin-queries";

export const GET = adminGuard(async (_req, ctx) => {
  const { id } = await ctx.params;
  const detail = await getWorkspaceDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  return NextResponse.json({ workspace: detail });
});

export const PATCH = adminGuard(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const session = await getRequestAdminSession(req);

  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db
    .update(workspaces)
    .set(updates)
    .where(eq(workspaces.id, id));

  await logAdminAction(session!.user.id, "update_workspace", "workspace", id, updates);

  return NextResponse.json({ success: true });
});

export const DELETE = adminGuard(async (req, ctx) => {
  const { id } = await ctx.params;
  const session = await getRequestAdminSession(req);

  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  await db.delete(workspaces).where(eq(workspaces.id, id));
  await logAdminAction(session!.user.id, "delete_workspace", "workspace", id);

  return NextResponse.json({ success: true });
});
