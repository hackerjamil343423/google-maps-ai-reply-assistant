import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { reviewAnalysisReports } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { and, eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { id } = await params;

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 500 });
  }

  const report = await db.query.reviewAnalysisReports.findFirst({
    where: and(
      eq(reviewAnalysisReports.id, id),
      eq(reviewAnalysisReports.workspaceId, workspaceId)
    ),
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  let reportData;
  try {
    reportData = JSON.parse(report.reportData);
  } catch {
    reportData = null;
  }

  return NextResponse.json({
    id: report.id,
    businessId: report.businessId,
    generatedAt: report.generatedAt.toISOString(),
    reviewCount: report.reviewCount,
    periodStart: report.periodStart.toISOString(),
    periodEnd: report.periodEnd.toISOString(),
    reportData,
  });
}
