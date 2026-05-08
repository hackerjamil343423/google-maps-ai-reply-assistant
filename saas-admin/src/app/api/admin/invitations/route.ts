import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

import { adminGuard } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import { teamInvitations, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const GET = adminGuard(async () => {
  if (!db) return NextResponse.json({ invitations: [] });

  const rows = await db
    .select({
      id: teamInvitations.id,
      email: teamInvitations.email,
      role: teamInvitations.role,
      createdAt: teamInvitations.createdAt,
      expiresAt: teamInvitations.expiresAt,
      acceptedAt: teamInvitations.acceptedAt,
      workspaceName: workspaces.name,
    })
    .from(teamInvitations)
    .innerJoin(workspaces, eq(teamInvitations.workspaceId, workspaces.id))
    .orderBy(desc(teamInvitations.createdAt));

  const invitations = rows.map((r) => ({
    ...r,
    status: r.acceptedAt ? "accepted" : new Date(r.expiresAt) < new Date() ? "expired" : "pending",
  }));

  return NextResponse.json({ invitations });
});
