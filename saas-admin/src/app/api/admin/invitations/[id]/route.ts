import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { adminGuard, getRequestAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import { teamInvitations } from "@/lib/db/schema";
import { logAdminAction } from "@/lib/admin-queries";

export const POST = adminGuard(async (req, ctx) => {
  const { id } = await ctx.params;
  const session = await getRequestAdminSession(req);

  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days

  const newToken = crypto.randomUUID();

  await db
    .update(teamInvitations)
    .set({ token: newToken, expiresAt: newExpiry, createdAt: new Date() })
    .where(eq(teamInvitations.id, id));

  await logAdminAction(session!.user.id, "resend_invitation", "invitation", id);

  return NextResponse.json({ success: true });
});

export const DELETE = adminGuard(async (req, ctx) => {
  const { id } = await ctx.params;
  const session = await getRequestAdminSession(req);

  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  await db.delete(teamInvitations).where(eq(teamInvitations.id, id));
  await logAdminAction(session!.user.id, "revoke_invitation", "invitation", id);

  return NextResponse.json({ success: true });
});
