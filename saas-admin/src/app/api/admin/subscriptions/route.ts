import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

import { adminGuard } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import { subscriptions, workspaces, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const GET = adminGuard(async () => {
  if (!db) return NextResponse.json({ subscriptions: [] });

  const rows = await db
    .select({
      workspaceId: subscriptions.workspaceId,
      plan: subscriptions.plan,
      status: subscriptions.status,
      billingInterval: subscriptions.billingInterval,
      createdAt: subscriptions.createdAt,
      workspaceName: workspaces.name,
      ownerEmail: user.email,
    })
    .from(subscriptions)
    .innerJoin(workspaces, eq(subscriptions.workspaceId, workspaces.id))
    .innerJoin(user, eq(workspaces.ownerUserId, user.id))
    .orderBy(desc(subscriptions.createdAt));

  return NextResponse.json({ subscriptions: rows });
});
