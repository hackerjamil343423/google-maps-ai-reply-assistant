import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api/session";
import { userCanAccessBusiness } from "@/lib/business-access";
import { db } from "@/lib/db";
import { reviewAnalysisReports } from "@/lib/db/schema";
import { getResponseStatsForBusiness } from "@/lib/reviews/analysis";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { and, eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { reportId } = await params;

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 500 });
  }

  const report = await db.query.reviewAnalysisReports.findFirst({
    where: and(
      eq(reviewAnalysisReports.id, reportId),
      eq(reviewAnalysisReports.workspaceId, workspaceId)
    ),
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const hasAccess = await userCanAccessBusiness(
    workspaceId,
    session.user.id,
    report.businessId
  );
  if (!hasAccess) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  let reportData;
  try {
    reportData = JSON.parse(report.reportData);
  } catch {
    reportData = null;
  }

  if (reportData) {
    const responseStats = await getResponseStatsForBusiness(
      report.businessId,
      report.periodStart,
      new Date(report.periodEnd.getTime() + 86400000)
    );

    const needsRepair =
      reportData.responseStats?.totalReplied !== responseStats.repliedCount ||
      reportData.responseStats?.replyRatePercent !== responseStats.replyRatePercent;

    if (needsRepair) {
      reportData = {
        ...reportData,
        responseStats: {
          totalReplied: responseStats.repliedCount,
          replyRatePercent: responseStats.replyRatePercent,
        },
      };

      await db
        .update(reviewAnalysisReports)
        .set({ reportData: JSON.stringify(reportData) })
        .where(eq(reviewAnalysisReports.id, report.id));
    }
  }

  return NextResponse.json({
    id: report.id,
    businessId: report.businessId,
    businessName: report.businessName || "Google Business",
    generatedAt: report.generatedAt.toISOString(),
    reviewCount: report.reviewCount,
    periodStart: report.periodStart.toISOString(),
    periodEnd: report.periodEnd.toISOString(),
    reportData,
  });
}
