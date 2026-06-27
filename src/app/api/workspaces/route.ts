import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { userProfiles, workspaceMembers, workspaces } from "@/lib/db/schema";
import {
  ACTIVE_WORKSPACE_COOKIE,
  createWorkspaceForUser,
  getWorkspaceIdForUser,
} from "@/lib/workspace";

const createWorkspaceSchema = z.object({
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

  const activeWorkspaceId = await getWorkspaceIdForUser(session.user.id);

  const memberships = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      role: workspaceMembers.role,
      workspaceName: workspaces.name,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, session.user.id));

  const cookieWorkspaceId = req.cookies.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const resolvedActiveId = cookieWorkspaceId
    ? (memberships.find((m) => m.workspaceId === cookieWorkspaceId)?.workspaceId ?? activeWorkspaceId)
    : activeWorkspaceId;

  return NextResponse.json({
    activeWorkspaceId: resolvedActiveId,
    workspaces: memberships.map((m) => ({
      id: m.workspaceId,
      name: m.workspaceName,
      role: m.role,
      isActive: m.workspaceId === resolvedActiveId,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = createWorkspaceSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
  }

  const workspaceId = await createWorkspaceForUser(
    session.user.id,
    parsed.data.name
  );
  if (!workspaceId) {
    return NextResponse.json({ error: "Unable to create workspace." }, { status: 500 });
  }

  await db
    .insert(userProfiles)
    .values({
      userId: session.user.id,
      onboardingCompleted: false,
    })
    .onConflictDoNothing();

  const response = NextResponse.json({
    success: true,
    workspace: {
      id: workspaceId,
      name: parsed.data.name,
      role: "owner",
      isActive: true,
    },
  });

  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
