import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { getInvitationAccess } from "@/lib/business-access";
import { db } from "@/lib/db";
import { teamInvitations, user, workspaces } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  if (!db) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  const { token } = await context.params;
  const invitation = await db.query.teamInvitations.findFirst({
    where: eq(teamInvitations.token, token),
    columns: {
      id: true,
      email: true,
      role: true,
      businessName: true,
      workspaceId: true,
      invitedBy: true,
      expiresAt: true,
      acceptedAt: true,
      accessAllBusinesses: true,
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, invitation.workspaceId),
    columns: { name: true },
  });
  const inviter = invitation.invitedBy
    ? await db.query.user.findFirst({
        where: eq(user.id, invitation.invitedBy),
        columns: { name: true },
      })
    : null;

  const session = await getRequestSession(req);
  const isExpired = invitation.expiresAt <= new Date();
  const isAccepted = invitation.acceptedAt !== null;
  const invitationAccess = await getInvitationAccess(invitation.id);

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    businessName: invitation.businessName,
    accessMode: invitationAccess.accessMode,
    businessIds: invitationAccess.businessIds,
    inviterName: inviter?.name ?? null,
    workspaceName: workspace?.name ?? "Primary Workspace",
    isExpired,
    isAccepted,
    requiresMatchingEmail:
      Boolean(session?.user.email) &&
      session!.user.email.toLowerCase() !== invitation.email.toLowerCase(),
    signedIn: Boolean(session),
  });
}
