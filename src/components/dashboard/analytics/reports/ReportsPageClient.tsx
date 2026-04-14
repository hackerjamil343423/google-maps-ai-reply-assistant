"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "@/components/DashboardShell";
import ReportCard from "@/components/dashboard/analytics/reports/ReportCard";
import type { ReportDetail } from "@/components/dashboard/analytics/reports/ReportCard";
import { useBusinessContext } from "@/lib/business-context";

type ConnectedBusiness = {
  id: string;
  name: string;
  googleLocationId: string | null;
  connectedAt: string | null;
  syncedReviewCount: number;
};

type ReportSummary = {
  id: string;
  businessId: string;
  businessName?: string;
  generatedAt: string;
  reviewCount: number;
  periodStart: string;
  periodEnd: string;
};

export default function ReportsPageClient() {
  const { activeBusiness } = useBusinessContext();
  const [businesses, setBusinesses] = useState<ConnectedBusiness[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<ConnectedBusiness | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [generateError, setGenerateError] = useState("");
  const [generateInfo, setGenerateInfo] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<"all_time" | "this_month">("this_month");
  const [reportLanguage, setReportLanguage] = useState<"en" | "ar">("en");

  const router = useRouter();
  const selectedBusinessReviewCount = selectedBusiness?.syncedReviewCount ?? 0;
  const visibleBusinesses = activeBusiness
    ? businesses.filter((business) => business.id === activeBusiness.id)
    : businesses;

  useEffect(() => {
    let mounted = true;
    setLoadingBusinesses(true);

    void fetch("/api/analytics/businesses", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return [];
        const data = (await res.json()) as { businesses: ConnectedBusiness[] };
        return data.businesses ?? [];
      })
      .then((list) => {
        if (!mounted) return;
        setBusinesses(list);
        if (list.length === 1) setSelectedBusiness(list[0]);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingBusinesses(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeBusiness) {
      setSelectedBusiness((current) => {
        const match = businesses.find((business) => business.id === activeBusiness.id);
        return match ?? current ?? null;
      });
      return;
    }

    setSelectedBusiness((current) => {
      if (current && businesses.some((business) => business.id === current.id)) {
        return current;
      }
      return visibleBusinesses.length === 1 ? visibleBusinesses[0] : null;
    });
  }, [activeBusiness, businesses, visibleBusinesses]);

  useEffect(() => {
    let mounted = true;
    setLoadingReports(true);

    void fetch("/api/analytics/reports/url/history", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ reports: ReportSummary[] }>;
      })
      .then((data) => {
        if (!mounted) return;
        if (data) setReports(data.reports);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingReports(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const visibleReports = activeBusiness
    ? reports.filter((report) => report.businessId === activeBusiness.id)
    : reports;

  const handleGenerateReport = useCallback(async () => {
    if (!selectedBusiness) return;

    if (selectedBusiness.syncedReviewCount < 1) {
      setGenerateInfo(`You do not have any reviews for "${selectedBusiness.name}" yet.`);
      setGenerateError("");
      setSuccess("");
      return;
    }

    setGenerating(true);
    setGenerateError("");
    setGenerateInfo("");
    setSuccess("");
    setSelectedReport(null);

    try {
      const res = await fetch("/api/analytics/reports/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: selectedBusiness.id,
          period: selectedPeriod,
          language: reportLanguage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422) {
          setGenerateInfo(
            data.message ||
              `You do not have any reviews for "${selectedBusiness.name}" in this period yet.`
          );
          return;
        }

        setGenerateError(data.error || "Failed to generate report");
        return;
      }

      const newReport: ReportSummary = {
        id: data.id,
        businessId: data.businessId,
        businessName: data.businessName,
        generatedAt: data.generatedAt,
        reviewCount: data.reviewCount,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      };

      setReports((prev) => [newReport, ...prev]);
      setSuccess(`Report generated for "${data.businessName}" with ${data.reviewCount} reviews!`);
      setSelectedReport({ ...newReport, reportData: data.reportData });
    } catch {
      setGenerateError("An error occurred. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [selectedBusiness, selectedPeriod, reportLanguage]);

  async function handleViewReport(report: ReportSummary) {
    router.push(`/dashboard/reports/${report.id}`);
  }

  return (
    <DashboardShell activeHref="/dashboard/reports">
      <div>
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5F30EB]">Analytics</p>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-[#040404]">AI Reviews Analysis</h2>
          <p className="mt-2 text-sm text-[#6A6A82]">
            Generate an AI-powered analysis report from your connected business reviews.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5 mb-6">
          {loadingBusinesses ? (
            <div className="flex items-center gap-2 py-4">
              <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6A6A82" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span className="text-sm text-[#6A6A82]">Loading businesses...</span>
            </div>
          ) : visibleBusinesses.length === 0 ? (
            <div className="text-center py-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E6E9F8" strokeWidth="2" className="mx-auto mb-3" aria-hidden="true">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm text-[#6A6A82] mb-3">No connected businesses found.</p>
              <a
                href="/dashboard/settings"
                className="text-sm text-[#5F30EB] hover:underline font-medium"
              >
                Connect your Google Business in Settings
              </a>
            </div>
          ) : (
            <>
              <label className="block text-sm font-medium text-[#040404] mb-2">
                Select Business
              </label>
              {visibleBusinesses.length === 1 ? (
                <div className="flex items-center gap-3 p-3 rounded-2xl border border-[#5F30EB] bg-[#F0EBFF]">
                  <div className="w-8 h-8 rounded-lg bg-[#5F30EB] text-white flex items-center justify-center text-xs font-bold">
                    {selectedBusiness?.name?.charAt(0) || "B"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#040404]">{selectedBusiness?.name || visibleBusinesses[0].name}</p>
                    <p className="text-xs text-[#6A6A82]">
                      {selectedBusiness?.syncedReviewCount ?? visibleBusinesses[0].syncedReviewCount} synced reviews
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleBusinesses.map((biz) => (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        setSelectedBusiness(biz);
                        setGenerateError("");
                        setGenerateInfo("");
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                        selectedBusiness?.id === biz.id
                          ? "border-[#5F30EB] bg-[#F0EBFF]"
                          : "border-[#E6E9F8] hover:border-[#5F30EB]/30 hover:bg-[#F8F7FF]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        selectedBusiness?.id === biz.id
                          ? "bg-[#5F30EB] text-white"
                          : "bg-[#F0EBFF] text-[#5F30EB]"
                      }`}>
                        {biz.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#040404]">{biz.name}</p>
                        <p className="text-xs text-[#6A6A82]">
                          {biz.syncedReviewCount} synced reviews
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {businesses.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#6A6A82] mb-1.5">Period</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as typeof selectedPeriod)}
                  className="w-full rounded-2xl border border-[#E6E9F8] bg-white px-3 py-2.5 text-sm text-[#4F4A63] outline-none focus:border-[#5F30EB]/35 focus:ring-2 focus:ring-[#5F30EB]/12"
                >
                  <option value="all_time">All Time</option>
                  <option value="this_month">This Month</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6A6A82] mb-1.5">Report Language</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReportLanguage("en")}
                    className={`flex-1 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      reportLanguage === "en"
                        ? "border-[#5F30EB] bg-[#5F30EB] text-white"
                        : "border-[#E6E9F8] text-[#6A6A82] hover:border-[#5F30EB]/30"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportLanguage("ar")}
                    className={`flex-1 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      reportLanguage === "ar"
                        ? "border-[#5F30EB] bg-[#5F30EB] text-white"
                        : "border-[#E6E9F8] text-[#6A6A82] hover:border-[#5F30EB]/30"
                    }`}
                  >
                    العربية
                  </button>
                </div>
              </div>
            </div>
          )}

          {businesses.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleGenerateReport()}
                disabled={!selectedBusiness || generating || selectedBusinessReviewCount < 1}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition-all ${
                  !selectedBusiness || generating || selectedBusinessReviewCount < 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-[#5F30EB] text-white hover:bg-[#4a27c9] shadow-[0_4px_16px_rgba(95,48,235,0.24)]"
                }`}
              >
                {generating ? (
                  <>
                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M12 2v4" /><path d="m6.34 7.34 2.83 2.83" /><path d="M2 12h4" />
                      <path d="m17.66 7.34-2.83 2.83" /><path d="M22 12h-4" />
                      <path d="M12 18v4" /><path d="m6.34 16.66 2.83-2.83" />
                      <path d="m17.66 16.66-2.83-2.83" />
                    </svg>
                    Generate Report
                  </>
                )}
              </button>
              {selectedBusiness && selectedBusinessReviewCount < 1 && (
                <p className="text-sm text-[#6A6A82]">
                  You do not have any reviews for this business yet.
                </p>
              )}
            </div>
          )}
          {generateError && <p className="text-sm text-red-500 mt-3">{generateError}</p>}
          {generateInfo && <p className="text-sm text-[#6A6A82] mt-3">{generateInfo}</p>}
          {success && <p className="text-sm text-green-500 mt-3">{success}</p>}
        </div>

        {selectedReport?.reportData && !generating && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#040404]">
                Latest Report{selectedReport.businessName ? ` - ${selectedReport.businessName}` : ""}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="text-xs text-[#6A6A82] hover:text-[#5F30EB] transition-colors"
              >
                Close
              </button>
            </div>
            <ReportCard report={selectedReport.reportData} />
          </div>
        )}

        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
          <h3 className="text-sm font-semibold text-[#040404] mb-4">Report History</h3>

          {loadingReports ? (
            <p className="text-sm text-[#6A6A82]">Loading reports...</p>
          ) : visibleReports.length === 0 ? (
            <div className="text-center py-8">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E6E9F8" strokeWidth="2" className="mx-auto mb-3" aria-hidden="true">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm text-[#6A6A82]">No reports yet for the current business selection.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => void handleViewReport(report)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-[#E6E9F8] hover:border-[#5F30EB]/30 hover:bg-[#F8F7FF] transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#F0EBFF] text-[#5F30EB] flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#040404]">
                        {report.businessName || "Google Business"}
                      </p>
                      <p className="text-xs text-[#6A6A82] mt-0.5">
                        {report.reviewCount} reviews &bull; {new Date(report.generatedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-[#6A6A82]"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
