import { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { userCanAccessBusiness } from "@/lib/business-access";
import { db } from "@/lib/db";
import { reviewAnalysisReports } from "@/lib/db/schema";
import { getResponseStatsForBusiness } from "@/lib/reviews/analysis";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { and, eq } from "drizzle-orm";
import DashboardShell from "@/components/DashboardShell";
import ReportCard from "@/components/dashboard/analytics/reports/ReportCard";
import type { ReportData } from "@/components/dashboard/analytics/reports/ReportCard";

export async function generateMetadata(
  props: Promise<{ params: Promise<{ reportId: string }> }>
): Promise<Metadata> {
  const { reportId } = await (await props).params;
  return { title: `Report ${reportId.slice(0, 8)}… | Wakkelni` };
}

export default async function ReportDetailPage(
  props: Promise<{ params: Promise<{ reportId: string }> }>
) {
  const { reportId } = await (await props).params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  if (!db) {
    return (
      <DashboardShell activeHref="/dashboard/reports">
        <ErrorState reportId={reportId} message="Database not configured." />
      </DashboardShell>
    );
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return (
      <DashboardShell activeHref="/dashboard/reports">
        <ErrorState reportId={reportId} message="Workspace not found." />
      </DashboardShell>
    );
  }

  const report = await db.query.reviewAnalysisReports.findFirst({
    where: and(
      eq(reviewAnalysisReports.id, reportId),
      eq(reviewAnalysisReports.workspaceId, workspaceId)
    ),
  });

  if (!report) {
    return (
      <DashboardShell activeHref="/dashboard/reports">
        <ErrorState reportId={reportId} message="Report not found. It may have been deleted or you don't have access." />
      </DashboardShell>
    );
  }

  const hasAccess = await userCanAccessBusiness(
    workspaceId,
    session.user.id,
    report.businessId
  );
  if (!hasAccess) {
    return (
      <DashboardShell activeHref="/dashboard/reports">
        <ErrorState reportId={reportId} message="Report not found. It may have been deleted or you don't have access." />
      </DashboardShell>
    );
  }

  let reportData: ReportData | null = null;
  try {
    reportData = JSON.parse(report.reportData) as ReportData;
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

  return (
    <DashboardShell activeHref="/dashboard/reports">
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/reports"
            className="inline-flex items-center gap-1.5 text-sm text-[#6A6A82] hover:text-[#5F30EB] transition-colors mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Reports
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5F30EB]">Analytics</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-[#040404]">
              {reportData ? "AI Reviews Analysis" : (report.businessId || "Report")}
            </h2>
            <p className="mt-2 text-sm text-[#6A6A82]">
              {report.reviewCount} reviews &bull;{" "}
              {new Date(report.periodStart).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              {" – "}
              {new Date(report.periodEnd).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              <span className="mx-2">&bull;</span>
              Generated {new Date(report.generatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Report Card */}
        {reportData ? (
          <ReportCard report={reportData} />
        ) : (
          <div className="rounded-2xl border border-[#E6E9F8] bg-white p-8 text-center">
            <p className="text-sm text-[#6A6A82]">Report data is not available.</p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function ErrorState({ reportId, message }: { reportId: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E6E9F8" strokeWidth="1.5" className="mb-4" aria-hidden="true">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
      <h2 className="text-lg font-semibold text-[#040404] mb-2">Report not found</h2>
      <p className="text-sm text-[#6A6A82] mb-6">{message}</p>
      <Link
        href="/dashboard/reports"
        className="inline-flex items-center gap-2 rounded-2xl bg-[#5F30EB] px-5 py-3 text-sm font-medium text-white hover:bg-[#4a27c9] transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Reports
      </Link>
    </div>
  );
}
