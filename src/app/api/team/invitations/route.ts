import { and, eq, gt, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { teamInvitations, user, workspaceMembers } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["VIEWER", "EDITOR", "MANAGER"]),
  business: z.string().trim().optional(),
});

function toDbRole(role: "VIEWER" | "EDITOR" | "MANAGER") {
  if (role === "VIEWER") return "viewer";
  if (role === "EDITOR") return "editor";
  return "manager";
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
  const existingUser = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true },
  });

  if (existingUser) {
    const existingMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, existingUser.id)
      ),
      columns: { userId: true },
    });
    if (existingMember) {
      return NextResponse.json(
        { error: "This user is already in your workspace." },
        { status: 400 }
      );
    }

    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: existingUser.id,
      role,
    });

    return NextResponse.json({ success: true, status: "active" });
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

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(teamInvitations).values({
    workspaceId,
    email,
    role,
    token: randomUUID(),
    expiresAt,
    invitedBy: session.user.id,
  });

  return NextResponse.json({ success: true, status: "pending" });
}
