import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace";

const switchSchema = z.object({
  workspaceId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = switchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Verify the user is actually a member of the target workspace
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, parsed.data.workspaceId),
      eq(workspaceMembers.userId, session.user.id)
    ),
    columns: { workspaceId: true, role: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, parsed.data.workspaceId),
    columns: { id: true, name: true },
  });

  const response = NextResponse.json({
    success: true,
    workspace: {
      id: workspace?.id,
      name: workspace?.name,
      role: membership.role,
    },
  });

  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, parsed.data.workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
