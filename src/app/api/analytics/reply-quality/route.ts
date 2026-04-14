import { and, eq, gte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { replyAnalyticsEvents } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";

export async function GET(req: NextRequest) {
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

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const rows = await db.query.replyAnalyticsEvents.findMany({
    where: and(
      eq(replyAnalyticsEvents.workspaceId, workspaceId),
      gte(replyAnalyticsEvents.createdAt, since)
    ),
  });

  const generated = rows.filter((r) => r.eventType === "generated").length;
  const postedDirect = rows.filter(
    (r) => r.eventType === "posted_direct"
  ).length;
  const postedEdited = rows.filter(
    (r) => r.eventType === "posted_edited"
  ).length;
  const rejected = rows.filter((r) => r.eventType === "rejected").length;
  const totalPosted = postedDirect + postedEdited;

  const editRate =
    totalPosted > 0 ? Math.round((postedEdited / totalPosted) * 100) : 0;
  const postRate =
    generated > 0 ? Math.round((totalPosted / generated) * 100) : 0;

  const posted = rows.filter((r) => r.timeToPostMs != null);
  const avgTimeToPostMs =
    posted.length > 0
      ? Math.round(
          posted.reduce((s, r) => s + (r.timeToPostMs ?? 0), 0) / posted.length
        )
      : null;

  // Per-tone breakdown
  const toneStats = new Map<
    string,
    { generated: number; posted: number; edited: number }
  >();
  for (const row of rows) {
    if (!row.tone) continue;
    const entry = toneStats.get(row.tone) ?? {
      generated: 0,
      posted: 0,
      edited: 0,
    };
    if (row.eventType === "generated") entry.generated++;
    if (row.eventType === "posted_direct" || row.eventType === "posted_edited")
      entry.posted++;
    if (row.eventType === "posted_edited") entry.edited++;
    toneStats.set(row.tone, entry);
  }

  return NextResponse.json({
    period: "last_30_days",
    generated,
    postedDirect,
    postedEdited,
    rejected,
    editRate,
    postRate,
    avgTimeToPostMs,
    byTone: Object.fromEntries(toneStats),
  });
}
