import { NextRequest, NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";

import { getRequestSession } from "@/lib/api/session";
import { getAccessibleBusinessIds } from "@/lib/business-access";
import { db } from "@/lib/db";
import {
  reviewComparisonReportBusinesses,
  reviewComparisonReports,
} from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";

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

  const accessibleBusinessIds = new Set(
    await getAccessibleBusinessIds(workspaceId, session.user.id)
  );
  if (accessibleBusinessIds.size === 0) {
    return NextResponse.json({ reports: [] });
  }

  const reports = await db.query.reviewComparisonReports.findMany({
    where: eq(reviewComparisonReports.workspaceId, workspaceId),
    orderBy: [desc(reviewComparisonReports.generatedAt)],
    columns: {
      id: true,
      language: true,
      businessCount: true,
      generatedAt: true,
      reviewCount: true,
      periodStart: true,
      periodEnd: true,
    },
  });

  if (reports.length === 0) {
    return NextResponse.json({ reports: [] });
  }

  const reportBusinesses = await db.query.reviewComparisonReportBusinesses.findMany({
    where: inArray(
      reviewComparisonReportBusinesses.reportId,
      reports.map((report) => report.id)
    ),
    columns: {
      reportId: true,
      businessId: true,
      businessName: true,
    },
  });

  const businessesByReport = new Map<string, typeof reportBusinesses>();
  for (const row of reportBusinesses) {
    const current = businessesByReport.get(row.reportId) ?? [];
    current.push(row);
    businessesByReport.set(row.reportId, current);
  }

  return NextResponse.json({
    reports: reports
      .map((report) => {
        const businesses = businessesByReport.get(report.id) ?? [];
        const canAccessAll =
          businesses.length === report.businessCount &&
          businesses.every((business) => accessibleBusinessIds.has(business.businessId));

        if (!canAccessAll) return null;

        return {
          id: report.id,
          type: "comparison",
          businessCount: report.businessCount,
          businesses: businesses.map((business) => ({
            id: business.businessId,
            name: business.businessName,
          })),
          generatedAt: report.generatedAt.toISOString(),
          reviewCount: report.reviewCount,
          periodStart: report.periodStart.toISOString(),
          periodEnd: report.periodEnd.toISOString(),
        };
      })
      .filter(Boolean),
  });
}
