import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { reviewAnalysisReports } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 500 });
  }

  if (!db) {
    return NextResponse.json({ reports: [] });
  }

  const reports = await db.query.reviewAnalysisReports.findMany({
    where: eq(reviewAnalysisReports.workspaceId, workspaceId),
    orderBy: [desc(reviewAnalysisReports.generatedAt)],
    columns: {
      id: true,
      businessId: true,
      businessName: true,
      language: true,
      generatedAt: true,
      reviewCount: true,
      periodStart: true,
      periodEnd: true,
    },
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      businessId: r.businessId,
      businessName: r.businessName || "Google Business",
      generatedAt: r.generatedAt.toISOString(),
      reviewCount: r.reviewCount,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
    })),
  });
}
