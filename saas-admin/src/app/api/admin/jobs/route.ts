import { NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";

import { adminGuard } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/db/schema";

export const GET = adminGuard(async (req) => {
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20");
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select()
    .from(backgroundJobs)
    .where(status ? eq(backgroundJobs.status, status) : undefined)
    .orderBy(desc(backgroundJobs.createdAt))
    .limit(pageSize)
    .offset(offset);

  return NextResponse.json({ jobs: rows });
});
