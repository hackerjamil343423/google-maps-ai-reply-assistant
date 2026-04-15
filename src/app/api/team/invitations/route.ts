import { and, eq, gt, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import {
  replaceInvitationBusinessAssignments,
  validateBusinessIdsForWorkspace,
} from "@/lib/business-access";
import { db } from "@/lib/db";
import { businesses, teamInvitations, workspaceMembers, workspaces } from "@/lib/db/schema";
import { sendTeamInvitationEmail, TeamInvitationEmailError } from "@/lib/team-invitations";
import { ensureWorkspaceForUser } from "@/lib/workspace";

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["VIEWER", "EDITOR", "MANAGER"]),
  business: z.string().trim().optional(),
  accessMode: z.enum(["all", "selected"]).default("all"),
  businessIds: z.array(z.string().uuid()).default([]),
});

function toDbRole(role: "VIEWER" | "EDITOR" | "MANAGER") {
  if (role === "VIEWER") return "viewer";
  if (role === "EDITOR") return "editor";
  return "manager";
}

function toRoleLabel(role: "VIEWER" | "EDITOR" | "MANAGER") {
  if (role === "VIEWER") return "Viewer";
  if (role === "EDITOR") return "Editor";
  return "Manager";
}

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
  const parsed = inviteSchema.safeParse(payload);
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
      eq(workspaceMembers.userId, session.user.id)
    ),
    columns: { role: true },
  });
  if (!myMembership || !["owner", "manager"].includes(myMembership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = parsed.data.email.toLowerCase();
  if (email === session.user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot invite yourself." },
      { status: 400 }
    );
  }

  const role = toDbRole(parsed.data.role);
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { name: true },
  });

  const trimmedBusinessName = parsed.data.business?.trim() || null;
  if (trimmedBusinessName) {
    const business = await db.query.businesses.findFirst({
      where: and(
        eq(businesses.workspaceId, workspaceId),
        eq(businesses.name, trimmedBusinessName)
      ),
      columns: { id: true },
    });
    if (!business) {
      return NextResponse.json(
        { error: "Selected business was not found in this workspace." },
        { status: 400 }
      );
    }
  }

  let selectedBusinessIds: string[] = [];
  try {
    selectedBusinessIds =
      parsed.data.accessMode === "selected"
        ? await validateBusinessIdsForWorkspace(workspaceId, parsed.data.businessIds)
        : [];
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid profile selection." },
      { status: 400 }
    );
  }

  if (parsed.data.accessMode === "selected" && selectedBusinessIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one profile or use All profiles." },
      { status: 400 }
    );
  }

  const pending = await db.query.teamInvitations.findFirst({
    where: and(
      eq(teamInvitations.workspaceId, workspaceId),
      eq(teamInvitations.email, email),
      isNull(teamInvitations.acceptedAt),
      gt(teamInvitations.expiresAt, new Date())
    ),
    columns: { id: true },
  });

  if (pending) {
    return NextResponse.json(
      { error: "An invitation is already pending for this email." },
      { status: 400 }
    );
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [invitation] = await db.insert(teamInvitations).values({
    workspaceId,
    email,
    businessName: trimmedBusinessName,
    accessAllBusinesses: parsed.data.accessMode === "all",
    role,
    token,
    expiresAt,
    invitedBy: session.user.id,
  }).returning({ id: teamInvitations.id });

  if (invitation?.id) {
    await replaceInvitationBusinessAssignments({
      invitationId: invitation.id,
      accessMode: parsed.data.accessMode,
      businessIds: selectedBusinessIds,
    });
  }

  try {
    await sendTeamInvitationEmail({
      token,
      invitedEmail: email,
      inviterName: session.user.name || "A teammate",
      workspaceName: workspace?.name ?? "Primary Workspace",
      businessName: trimmedBusinessName,
      roleLabel: toRoleLabel(parsed.data.role),
    });
  } catch (error) {
    await db
      .delete(teamInvitations)
      .where(
        and(
          eq(teamInvitations.workspaceId, workspaceId),
          eq(teamInvitations.token, token)
        )
      );

    if (error instanceof TeamInvitationEmailError) {
      return NextResponse.json(
        { error: "Invitation email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL." },
        { status: 503 }
      );
    }

    console.error("Failed to send invitation email", error);
    return NextResponse.json(
      { error: "Failed to send the invitation email." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, status: "pending" });
}
