import { and, eq, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  replaceInvitationBusinessAssignments,
  replaceWorkspaceMemberBusinessAssignments,
  validateBusinessIdsForWorkspace,
} from "@/lib/business-access";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { teamInvitations, workspaceMembers, workspaces } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";

const updateAccessSchema = z.object({
  memberId: z.string().min(1),
  kind: z.enum(["active", "invitation"]),
  accessMode: z.enum(["all", "selected"]),
  businessIds: z.array(z.string().uuid()).default([]),
});

export async function PATCH(req: NextRequest) {
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

  const payload = await req.json().catch(() => null);
  const parsed = updateAccessSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
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

  let businessIds: string[] = [];
  try {
    businessIds =
      parsed.data.accessMode === "selected"
        ? await validateBusinessIdsForWorkspace(workspaceId, parsed.data.businessIds)
        : [];
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid profile selection." },
      { status: 400 }
    );
  }

  if (parsed.data.accessMode === "selected" && businessIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one profile or use All profiles." },
      { status: 400 }
    );
  }

  if (parsed.data.kind === "active") {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
      columns: { ownerUserId: true },
    });
    if (parsed.data.memberId === workspace?.ownerUserId) {
      return NextResponse.json(
        { error: "Owner always has access to all profiles." },
        { status: 400 }
      );
    }

    const target = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, parsed.data.memberId)
      ),
      columns: { userId: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    await replaceWorkspaceMemberBusinessAssignments({
      workspaceId,
      userId: parsed.data.memberId,
      accessMode: parsed.data.accessMode,
      businessIds,
    });
  } else {
    const target = await db.query.teamInvitations.findFirst({
      where: and(
        eq(teamInvitations.workspaceId, workspaceId),
        eq(teamInvitations.id, parsed.data.memberId)
      ),
      columns: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    await replaceInvitationBusinessAssignments({
      invitationId: parsed.data.memberId,
      accessMode: parsed.data.accessMode,
      businessIds,
    });
  }

  return NextResponse.json({ success: true });
}
