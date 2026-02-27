import { and, eq, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { teamInvitations, workspaceMembers } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";

const updateRoleSchema = z.object({
  memberId: z.string().min(1),
  kind: z.enum(["active", "invitation"]),
  role: z.enum(["VIEWER", "EDITOR", "MANAGER"]),
});

function toDbRole(role: "VIEWER" | "EDITOR" | "MANAGER") {
  if (role === "VIEWER") return "viewer";
  if (role === "EDITOR") return "editor";
  return "manager";
}

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
  const parsed = updateRoleSchema.safeParse(payload);
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

  const dbRole = toDbRole(parsed.data.role);

  if (parsed.data.kind === "active") {
    const target = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, parsed.data.memberId)
      ),
      columns: { role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (target.role === "owner") {
      return NextResponse.json(
        { error: "Owner role cannot be changed." },
        { status: 400 }
      );
    }

    await db
      .update(workspaceMembers)
      .set({ role: dbRole })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, parsed.data.memberId)
        )
      );
  } else {
    await db
      .update(teamInvitations)
      .set({ role: dbRole })
      .where(
        and(
          eq(teamInvitations.workspaceId, workspaceId),
          eq(teamInvitations.id, parsed.data.memberId)
        )
      );
  }

  return NextResponse.json({ success: true });
}
