import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import { ACTIVE_WORKSPACE_COOKIE, ensureWorkspaceForUser } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  // Ensure at least one workspace exists for this user
  const activeWorkspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);

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
