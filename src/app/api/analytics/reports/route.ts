import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api/session";
import { userCanAccessBusiness } from "@/lib/business-access";
import { db } from "@/lib/db";
import { businesses, reviewAnalysisReports } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { and, desc, eq, gte } from "drizzle-orm";
import { generateAnalysisReport } from "@/lib/ai/generate-analysis-report";
import { aggregateReviewsForBusiness } from "@/lib/reviews/analysis";

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 500 });
  }

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
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

  const reports = await db.query.reviewAnalysisReports.findMany({
    where: eq(reviewAnalysisReports.businessId, businessId),
    orderBy: [desc(reviewAnalysisReports.generatedAt)],
    columns: {
      id: true,
      businessId: true,
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
      generatedAt: r.generatedAt.toISOString(),
      reviewCount: r.reviewCount,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 500 });
  }

  const body = await req.json();
  const { businessId } = body;

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
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
    columns: { id: true, name: true },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Check monthly limit
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const existingReport = await db.query.reviewAnalysisReports.findFirst({
    where: and(
      eq(reviewAnalysisReports.businessId, businessId),
      gte(reviewAnalysisReports.generatedAt, thisMonth)
    ),
  });

  if (existingReport) {
    const nextMonth = new Date(thisMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return NextResponse.json(
      {
        error: "Report already generated this month",
        nextAvailable: nextMonth.toISOString(),
        existingReportId: existingReport.id,
      },
      { status: 429 }
    );
  }

  // Aggregate reviews
  const aggregatedData = await aggregateReviewsForBusiness(businessId);

  if (aggregatedData.totalCount === 0) {
    return NextResponse.json(
      { error: "No reviews available to analyze for this business" },
      { status: 400 }
    );
  }

  // Generate report via MiniMax
  const { reportData } = await generateAnalysisReport(businessId);

  // Save report
  const [newReport] = await db
    .insert(reviewAnalysisReports)
    .values({
      businessId,
      workspaceId,
      reportData: JSON.stringify(reportData),
      reviewCount: aggregatedData.totalCount,
      periodStart: aggregatedData.periodStart,
      periodEnd: aggregatedData.periodEnd,
    })
    .returning();

  return NextResponse.json({
    id: newReport.id,
    businessId: newReport.businessId,
    generatedAt: newReport.generatedAt.toISOString(),
    reviewCount: newReport.reviewCount,
    periodStart: newReport.periodStart.toISOString(),
    periodEnd: newReport.periodEnd.toISOString(),
    reportData,
  });
}
