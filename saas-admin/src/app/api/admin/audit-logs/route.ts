import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

import { adminGuard } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import { adminAuditLogs } from "@/lib/db/schema";

export const GET = adminGuard(async (req) => {
  if (!db) return NextResponse.json({ logs: [] });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20");
  const offset = (page - 1) * pageSize;

  const logs = await db
    .select()
    .from(adminAuditLogs)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(pageSize)
    .offset(offset);

  return NextResponse.json({ logs });
});
