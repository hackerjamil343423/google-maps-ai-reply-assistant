import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { getInvitationAccess, replaceWorkspaceMemberBusinessAssignments } from "@/lib/business-access";
import { db } from "@/lib/db";
import { teamInvitations, userProfiles, workspaceMembers } from "@/lib/db/schema";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace";

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

  // Add (or re-add) user to the invited workspace.
  // No conflict check — users can belong to multiple workspaces.
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

  // Mark onboarding as complete so the user lands in the dashboard, not onboarding.
  await db
    .insert(userProfiles)
    .values({
      userId: session.user.id,
      onboardingCompleted: true,
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        onboardingCompleted: true,
        updatedAt: new Date(),
      },
    });

  // Switch the active workspace cookie to the newly joined workspace.
  const response = NextResponse.json({
    success: true,
    workspaceId: invitation.workspaceId,
  });
  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, invitation.workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
