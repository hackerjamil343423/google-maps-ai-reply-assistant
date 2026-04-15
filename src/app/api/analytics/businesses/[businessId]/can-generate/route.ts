import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api/session";
import { userCanAccessBusiness } from "@/lib/business-access";
import { db } from "@/lib/db";
import { businesses, reviewAnalysisReports } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { and, desc, eq, gte } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { businessId } = await params;

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 500 });
  }

  const hasAccess = await userCanAccessBusiness(
    workspaceId,
    session.user.id,
    businessId
  );
  if (!hasAccess) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Verify business belongs to workspace
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.workspaceId, workspaceId), eq(businesses.id, businessId)),
    columns: { id: true },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const lastReport = await db.query.reviewAnalysisReports.findFirst({
    where: and(
      eq(reviewAnalysisReports.businessId, businessId),
      gte(reviewAnalysisReports.generatedAt, thisMonth)
    ),
    orderBy: [desc(reviewAnalysisReports.generatedAt)],
  });

  if (lastReport) {
    const nextMonth = new Date(thisMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return NextResponse.json({
      canGenerate: false,
      reason: `Report already generated this month. Next available: ${nextMonth.toLocaleDateString()}`,
      lastReportAt: lastReport.generatedAt.toISOString(),
    });
  }

  return NextResponse.json({
    canGenerate: true,
  });
}
