import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getRequestSession } from "@/lib/api/session";
import { userCanAccessBusinesses } from "@/lib/business-access";
import { db } from "@/lib/db";
import {
  reviewComparisonReportBusinesses,
  reviewComparisonReports,
} from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";

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

  const report = await db.query.reviewComparisonReports.findFirst({
    where: and(
      eq(reviewComparisonReports.id, reportId),
      eq(reviewComparisonReports.workspaceId, workspaceId)
    ),
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const reportBusinesses = await db.query.reviewComparisonReportBusinesses.findMany({
    where: eq(reviewComparisonReportBusinesses.reportId, report.id),
    columns: {
      businessId: true,
      businessName: true,
    },
  });

  if (reportBusinesses.length !== report.businessCount) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const hasAccess = await userCanAccessBusinesses(
    workspaceId,
    session.user.id,
    reportBusinesses.map((business) => business.businessId)
  );
  if (!hasAccess) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  let reportData = null;
  let businessSnapshot = null;

  try {
    reportData = JSON.parse(report.reportData);
  } catch {
    reportData = null;
  }

  try {
    businessSnapshot = JSON.parse(report.businessSnapshot);
  } catch {
    businessSnapshot = null;
  }

  return NextResponse.json({
    id: report.id,
    type: "comparison",
    language: report.language || "en",
    businessCount: report.businessCount,
    businesses: reportBusinesses.map((business) => ({
      id: business.businessId,
      name: business.businessName,
    })),
    businessSnapshot,
    generatedAt: report.generatedAt.toISOString(),
    reviewCount: report.reviewCount,
    periodStart: report.periodStart.toISOString(),
    periodEnd: report.periodEnd.toISOString(),
    reportData,
  });
}
