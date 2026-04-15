import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import { ACTIVE_WORKSPACE_COOKIE, ensureWorkspaceForUser } from "@/lib/workspace";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { id: true, name: true, ownerUserId: true },
  });

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, session.user.id)
    ),
    columns: { role: true },
  });

  return NextResponse.json({
    id: workspace?.id,
    name: workspace?.name,
    role: membership?.role ?? "viewer",
    isOwner: workspace?.ownerUserId === session.user.id,
  });
}

// Update workspace name (owner only)
export async function PATCH(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { ownerUserId: true },
  });

  if (workspace?.ownerUserId !== session.user.id) {
    return NextResponse.json({ error: "Only the workspace owner can rename it." }, { status: 403 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Name must be between 1 and 100 characters." }, { status: 400 });
  }

  await db
    .update(workspaces)
    .set({ name: parsed.data.name })
    .where(eq(workspaces.id, workspaceId));

  return NextResponse.json({ success: true, name: parsed.data.name });
}

// Leave workspace (non-owners only)
export async function DELETE(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { ownerUserId: true },
  });

  if (workspace?.ownerUserId === session.user.id) {
    return NextResponse.json(
      { error: "The workspace owner cannot leave. Transfer ownership first or delete the workspace." },
      { status: 403 }
    );
  }

  // Remove membership
  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      )
    );

  // Find another workspace to fall back to (first one that isn't the one they left)
  const nextMembership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.userId, session.user.id),
      ne(workspaceMembers.workspaceId, workspaceId)
    ),
    columns: { workspaceId: true },
  });

  const nextWorkspaceId = nextMembership?.workspaceId ?? null;

  const response = NextResponse.json({ success: true, nextWorkspaceId });

  if (nextWorkspaceId) {
    response.cookies.set(ACTIVE_WORKSPACE_COOKIE, nextWorkspaceId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    // Clear the cookie — ensureWorkspaceForUser will create a new personal workspace on next request
    response.cookies.delete(ACTIVE_WORKSPACE_COOKIE);
  }

  return response;
}
