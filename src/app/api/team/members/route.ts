import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { teamInvitations, user, workspaceMembers, workspaces } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";

type UiRole = "VIEWER" | "EDITOR" | "MANAGER";

function toUiRole(role: string): UiRole {
  if (role === "viewer") return "VIEWER";
  if (role === "editor") return "EDITOR";
  return "MANAGER";
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(value);
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({
      workspaceName: "Primary Workspace",
      businesses: ["Primary Workspace"],
      members: [],
    });
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

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { name: true },
  });

  const myMembership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, session.user.id)
    ),
    columns: { role: true },
  });
  const canManage = myMembership?.role === "owner" || myMembership?.role === "manager";

  const activeMembers = await db
    .select({
      memberUserId: workspaceMembers.userId,
      memberRole: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
      email: user.email,
    })
    .from(workspaceMembers)
    .innerJoin(user, eq(user.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(desc(workspaceMembers.createdAt));

  const pendingInvites = await db.query.teamInvitations.findMany({
    where: and(
      eq(teamInvitations.workspaceId, workspaceId),
      isNull(teamInvitations.acceptedAt),
      gt(teamInvitations.expiresAt, new Date())
    ),
    orderBy: desc(teamInvitations.createdAt),
  });

  const members = [
    ...activeMembers.map((item) => {
      const isOwner = item.memberRole === "owner";
      return {
        id: item.memberUserId,
        kind: "active" as const,
        email: item.email,
        role: toUiRole(item.memberRole),
        business: workspace?.name ?? "Primary Workspace",
        status: "active" as const,
        joinedAt: formatDate(item.createdAt),
        canEditRole: canManage && !isOwner,
        canRemove: canManage && !isOwner,
      };
    }),
    ...pendingInvites.map((item) => ({
      id: item.id,
      kind: "invitation" as const,
      email: item.email,
      role: toUiRole(item.role),
      business: workspace?.name ?? "Primary Workspace",
      status: "pending" as const,
      joinedAt: "—",
      canEditRole: canManage,
      canRemove: canManage,
    })),
  ];

  return NextResponse.json({
    workspaceName: workspace?.name ?? "Primary Workspace",
    businesses: [workspace?.name ?? "Primary Workspace"],
    members,
  });
}

export async function DELETE(req: NextRequest) {
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

  const myMembership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, session.user.id),
      or(eq(workspaceMembers.role, "owner"), eq(workspaceMembers.role, "manager"))
    ),
    columns: { userId: true },
  });
  if (!myMembership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const memberId =
    typeof body?.memberId === "string" ? body.memberId.trim() : "";
  const kind = body?.kind === "invitation" ? "invitation" : "active";

  if (!memberId) {
    return NextResponse.json({ error: "Invalid memberId" }, { status: 400 });
  }

  if (kind === "active") {
    const member = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, memberId)
      ),
      columns: { role: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Owner cannot be removed." },
        { status: 400 }
      );
    }
    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, memberId)
        )
      );
  } else {
    await db
      .delete(teamInvitations)
      .where(
        and(
          eq(teamInvitations.workspaceId, workspaceId),
          eq(teamInvitations.id, memberId)
        )
      );
  }

  return NextResponse.json({ success: true });
}
