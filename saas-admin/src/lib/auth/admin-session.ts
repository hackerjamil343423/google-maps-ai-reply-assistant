import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { adminAuth } from "@/lib/auth/admin-auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export async function getRequestAdminSession(req: NextRequest) {
  const session = await adminAuth.api.getSession({
    headers: req.headers,
  });
  if (!session?.user) return null;

  if (!db) return null;
  const adminUser = await db
    .select({ isAdmin: user.isAdmin, suspended: user.suspended })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!adminUser || !adminUser.isAdmin || adminUser.suspended) {
    return null;
  }

  return session;
}

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export function adminGuard(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await getRequestAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, ctx);
  };
}
