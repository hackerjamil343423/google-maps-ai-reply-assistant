import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { getInvitationAccess, replaceWorkspaceMemberBusinessAssignments } from "@/lib/business-access";
import { db } from "@/lib/db";
import { businesses, teamInvitations, workspaceMembers, workspaces } from "@/lib/db/schema";

const acceptSchema = z.object({
  token: z.string().min(1),
});

export async function POST(req: NextRequest) {
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
  const parsed = acceptSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const invitation = await db.query.teamInvitations.findFirst({
    where: and(
      eq(teamInvitations.token, parsed.data.token),
      isNull(teamInvitations.acceptedAt),
      gt(teamInvitations.expiresAt, new Date())
    ),
    columns: {
      id: true,
      email: true,
      role: true,
      workspaceId: true,
      accessAllBusinesses: true,
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation is invalid or expired." },
      { status: 404 }
    );
  }

  if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Sign in with the invited email address to accept this invitation." },
      { status: 403 }
    );
  }

  const existingMembership = await db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.userId, session.user.id),
    columns: { workspaceId: true, role: true },
  });

  if (
    existingMembership &&
    existingMembership.workspaceId !== invitation.workspaceId
  ) {
    const existingWorkspaceId = existingMembership.workspaceId;
    const existingWorkspaceMembers = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.workspaceId, existingWorkspaceId),
      columns: { userId: true },
    });
    const existingBusinesses = await db.query.businesses.findMany({
      where: eq(businesses.workspaceId, existingWorkspaceId),
      columns: { id: true },
    });

    const canAutoMove =
      existingMembership.role === "owner" &&
      existingWorkspaceMembers.length === 1 &&
      existingWorkspaceMembers[0]?.userId === session.user.id &&
      existingBusinesses.length === 0;

    if (!canAutoMove) {
      return NextResponse.json(
        {
          error:
            "This account already belongs to another active workspace. Remove it from that workspace first, or use a different email for this invitation.",
        },
        { status: 409 }
      );
    }

    await db
      .delete(workspaces)
      .where(eq(workspaces.id, existingWorkspaceId));
  }

  await db
    .insert(workspaceMembers)
    .values({
      workspaceId: invitation.workspaceId,
      userId: session.user.id,
      role: invitation.role,
      accessAllBusinesses: invitation.accessAllBusinesses,
    })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
      set: {
        role: invitation.role,
        accessAllBusinesses: invitation.accessAllBusinesses,
      },
    });

  const invitationAccess = await getInvitationAccess(invitation.id);
  await replaceWorkspaceMemberBusinessAssignments({
    workspaceId: invitation.workspaceId,
    userId: session.user.id,
    accessMode: invitationAccess.accessMode,
    businessIds: invitationAccess.businessIds,
  });

  await db
    .update(teamInvitations)
    .set({ acceptedAt: new Date() })
    .where(eq(teamInvitations.id, invitation.id));

  await db
    .delete(teamInvitations)
    .where(
      and(
        eq(teamInvitations.workspaceId, invitation.workspaceId),
        eq(teamInvitations.email, invitation.email),
        isNull(teamInvitations.acceptedAt),
        ne(teamInvitations.id, invitation.id)
      )
    );

  return NextResponse.json({ success: true });
}
