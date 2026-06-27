import { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import DashboardShell from "@/components/DashboardShell";
import ComparisonReportCard from "@/components/dashboard/analytics/reports/ComparisonReportCard";
import { auth } from "@/lib/auth";
import { userCanAccessBusinesses } from "@/lib/business-access";
import { db } from "@/lib/db";
import {
  reviewComparisonReportBusinesses,
  reviewComparisonReports,
} from "@/lib/db/schema";
import type { ComparisonReportData } from "@/lib/ai/generate-comparison-report";
import { ensureWorkspaceForUser } from "@/lib/workspace";

export async function generateMetadata(
  props: Promise<{ params: Promise<{ reportId: string }> }>
): Promise<Metadata> {
  const { reportId } = await (await props).params;
  return { title: `Comparison ${reportId.slice(0, 8)}... | Wakkelni` };
}

export default async function ComparisonReportDetailPage(
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
        <ErrorState message="Database not configured." />
      </DashboardShell>
    );
  }

  const workspaceId = await ensureWorkspaceForUser(session.user.id, session.user.name);
  if (!workspaceId) {
    return (
      <DashboardShell activeHref="/dashboard/reports">
        <ErrorState message="Workspace not found." />
      </DashboardShell>
    );
  }

  const report = await db.query.reviewComparisonReports.findFirst({
    where: and(
      eq(reviewComparisonReports.id, reportId),
      eq(reviewComparisonReports.workspaceId, workspaceId)
    ),
  });

  if (!report) {
    return (
      <DashboardShell activeHref="/dashboard/reports">
        <ErrorState message="Comparison report not found. It may have been deleted or you don't have access." />
      </DashboardShell>
    );
  }

  const reportBusinesses = await db.query.reviewComparisonReportBusinesses.findMany({
    where: eq(reviewComparisonReportBusinesses.reportId, report.id),
    columns: {
      businessId: true,
      businessName: true,
    },
  });

  const hasAccess =
    reportBusinesses.length === report.businessCount &&
    (await userCanAccessBusinesses(
      workspaceId,
      session.user.id,
      reportBusinesses.map((business) => business.businessId)
    ));

  if (!hasAccess) {
    return (
      <DashboardShell activeHref="/dashboard/reports">
        <ErrorState message="Comparison report not found. It may have been deleted or you don't have access." />
      </DashboardShell>
    );
  }

  let reportData: ComparisonReportData | null = null;
  try {
    reportData = JSON.parse(report.reportData) as ComparisonReportData;
  } catch {
    reportData = null;
  }

  const businessNames = reportBusinesses
    .map((business) => business.businessName)
    .join(" vs ");

  return (
    <DashboardShell activeHref="/dashboard/reports">
      <div>
        <div className="mb-6">
          <Link
            href="/dashboard/reports"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#6A6A82] transition-colors hover:text-[#5F30EB]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Reports
          </Link>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#5F30EB]">
              Comparison
            </p>
            <h2 className="text-2xl font-semibold text-[#040404] md:text-3xl">
              {businessNames || "Business Comparison"}
            </h2>
            <p className="mt-2 text-sm text-[#6A6A82]">
              {report.reviewCount} reviews across {report.businessCount} businesses
              {" | "}
              {new Date(report.periodStart).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {" - "}
              {new Date(report.periodEnd).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {" | "}
              Generated{" "}
              {new Date(report.generatedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {reportData ? (
          <ComparisonReportCard report={reportData} />
        ) : (
          <div className="rounded-2xl border border-[#E6E9F8] bg-white p-8 text-center">
            <p className="text-sm text-[#6A6A82]">
              Comparison report data is not available.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#E6E9F8"
        strokeWidth="1.5"
        className="mb-4"
        aria-hidden="true"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
      <h2 className="mb-2 text-lg font-semibold text-[#040404]">
        Comparison not found
      </h2>
      <p className="mb-6 text-sm text-[#6A6A82]">{message}</p>
      <Link
        href="/dashboard/reports"
        className="inline-flex items-center gap-2 rounded-2xl bg-[#5F30EB] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#4a27c9]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Reports
      </Link>
    </div>
  );
}
