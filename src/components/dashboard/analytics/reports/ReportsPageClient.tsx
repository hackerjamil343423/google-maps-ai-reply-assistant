"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "@/components/DashboardShell";
import ComparisonReportCard from "@/components/dashboard/analytics/reports/ComparisonReportCard";
import ReportCard from "@/components/dashboard/analytics/reports/ReportCard";
import type { ReportDetail } from "@/components/dashboard/analytics/reports/ReportCard";
import { useBusinessContext } from "@/lib/business-context";
import type { ComparisonReportData } from "@/lib/ai/generate-comparison-report";

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

type ComparisonSummary = {
  id: string;
  type: "comparison";
  businesses: Array<{ id: string; name: string }>;
  businessCount: number;
  generatedAt: string;
  reviewCount: number;
  periodStart: string;
  periodEnd: string;
};

type ComparisonDetail = ComparisonSummary & {
  reportData: ComparisonReportData;
};

type HistoryItem =
  | (ReportSummary & { type: "single" })
  | ComparisonSummary;

type ComparisonGenerateResponse = {
  id?: string;
  businesses?: Array<{ id: string; name: string }>;
  businessCount?: number;
  generatedAt?: string;
  reviewCount?: number;
  periodStart?: string;
  periodEnd?: string;
  reportData?: ComparisonReportData;
  error?: string;
  message?: string;
};

export default function ReportsPageClient() {
  const { activeBusiness } = useBusinessContext();
  const [reportMode, setReportMode] = useState<"single" | "comparison">("single");
  const [businesses, setBusinesses] = useState<ConnectedBusiness[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<ConnectedBusiness | null>(null);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [comparisonReports, setComparisonReports] = useState<ComparisonSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingComparisonReports, setLoadingComparisonReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [selectedComparisonReport, setSelectedComparisonReport] =
    useState<ComparisonDetail | null>(null);
  const [generateError, setGenerateError] = useState("");
  const [generateInfo, setGenerateInfo] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPeriod, setSelectedPeriod] =
    useState<"all_time" | "this_month">("this_month");
  const [reportLanguage, setReportLanguage] = useState<"en" | "ar">("en");

  const router = useRouter();
  const selectedBusinessReviewCount = selectedBusiness?.syncedReviewCount ?? 0;

  const singleVisibleBusinesses = useMemo(
    () =>
      activeBusiness
        ? businesses.filter((business) => business.id === activeBusiness.id)
        : businesses,
    [activeBusiness, businesses]
  );

  const visibleBusinesses =
    reportMode === "comparison" ? businesses : singleVisibleBusinesses;

  const selectedComparisonBusinesses = useMemo(
    () =>
      selectedBusinessIds
        .map((businessId) => businesses.find((business) => business.id === businessId))
        .filter((business): business is ConnectedBusiness => Boolean(business)),
    [businesses, selectedBusinessIds]
  );

  const comparisonHasValidSelection =
    selectedBusinessIds.length >= 2 &&
    selectedBusinessIds.length <= 3 &&
    selectedComparisonBusinesses.length === selectedBusinessIds.length;

  const comparisonHasEnoughReviews =
    comparisonHasValidSelection &&
    selectedComparisonBusinesses.every((business) => business.syncedReviewCount > 0);

  const generateButtonDisabled =
    reportMode === "single"
      ? !selectedBusiness || generating || selectedBusinessReviewCount < 1
      : generating || !comparisonHasValidSelection || !comparisonHasEnoughReviews;

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
      return singleVisibleBusinesses.length === 1 ? singleVisibleBusinesses[0] : null;
    });
  }, [activeBusiness, businesses, singleVisibleBusinesses]);

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

  useEffect(() => {
    let mounted = true;
    setLoadingComparisonReports(true);

    void fetch("/api/analytics/comparison-reports/history", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ reports: ComparisonSummary[] }>;
      })
      .then((data) => {
        if (!mounted) return;
        if (data) setComparisonReports(data.reports);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingComparisonReports(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const visibleReports = useMemo(
    () =>
      activeBusiness
        ? reports.filter((report) => report.businessId === activeBusiness.id)
        : reports,
    [activeBusiness, reports]
  );

  const visibleComparisonReports = useMemo(
    () =>
      activeBusiness
        ? comparisonReports.filter((report) =>
            report.businesses.some((business) => business.id === activeBusiness.id)
          )
        : comparisonReports,
    [activeBusiness, comparisonReports]
  );

  const historyItems = useMemo<HistoryItem[]>(
    () =>
      [
        ...visibleReports.map((report) => ({ ...report, type: "single" as const })),
        ...visibleComparisonReports,
      ].sort(
        (a, b) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      ),
    [visibleReports, visibleComparisonReports]
  );

  const clearMessages = useCallback(() => {
    setGenerateError("");
    setGenerateInfo("");
    setSuccess("");
  }, []);

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
    setSelectedComparisonReport(null);

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

  const handleGenerateComparison = useCallback(async () => {
    if (!comparisonHasValidSelection) {
      setGenerateInfo("Select 2 or 3 businesses to compare.");
      setGenerateError("");
      setSuccess("");
      return;
    }

    const businessesWithoutReviews = selectedComparisonBusinesses.filter(
      (business) => business.syncedReviewCount < 1
    );
    if (businessesWithoutReviews.length > 0) {
      setGenerateInfo(
        `Every selected business needs reviews. Missing: ${businessesWithoutReviews
          .map((business) => business.name)
          .join(", ")}`
      );
      setGenerateError("");
      setSuccess("");
      return;
    }

    setGenerating(true);
    setGenerateError("");
    setGenerateInfo("");
    setSuccess("");
    setSelectedReport(null);
    setSelectedComparisonReport(null);

    try {
      const res = await fetch("/api/analytics/comparison-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessIds: selectedBusinessIds,
          period: selectedPeriod,
          language: reportLanguage,
        }),
      });

      const data = (await res.json()) as ComparisonGenerateResponse;

      if (!res.ok) {
        if (res.status === 422) {
          setGenerateInfo(data.message || "Some selected businesses need reviews first.");
          return;
        }

        setGenerateError(data.error || "Failed to generate comparison");
        return;
      }

      if (
        !data.id ||
        !data.businesses ||
        !data.generatedAt ||
        typeof data.reviewCount !== "number" ||
        !data.periodStart ||
        !data.periodEnd ||
        !data.reportData
      ) {
        setGenerateError("Comparison response was incomplete.");
        return;
      }

      const newReport: ComparisonSummary = {
        id: data.id,
        type: "comparison",
        businesses: data.businesses,
        businessCount: data.businessCount ?? data.businesses.length,
        generatedAt: data.generatedAt,
        reviewCount: data.reviewCount,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      };

      setComparisonReports((prev) => [newReport, ...prev]);
      setSelectedComparisonReport({ ...newReport, reportData: data.reportData });
      setSuccess(
        `Comparison generated for ${data.businesses
          .map((business) => business.name)
          .join(" vs ")} with ${data.reviewCount} reviews!`
      );
    } catch {
      setGenerateError("An error occurred. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [
    comparisonHasValidSelection,
    selectedBusinessIds,
    selectedComparisonBusinesses,
    selectedPeriod,
    reportLanguage,
  ]);

  function toggleComparisonBusiness(businessId: string) {
    setSelectedBusinessIds((current) => {
      if (current.includes(businessId)) {
        return current.filter((id) => id !== businessId);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, businessId];
    });
    clearMessages();
  }

  async function handleViewReport(report: ReportSummary) {
    router.push(`/dashboard/reports/${report.id}`);
  }

  async function handleViewComparison(report: ComparisonSummary) {
    router.push(`/dashboard/reports/comparisons/${report.id}`);
  }

  return (
    <DashboardShell activeHref="/dashboard/reports">
      <div>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold text-[#040404] md:text-3xl">
            AI Reviews Analysis
          </h2>
          <div className="inline-flex w-full rounded-2xl border border-[#E6E9F8] bg-white p-1 md:w-auto">
            <button
              type="button"
              onClick={() => {
                setReportMode("single");
                clearMessages();
              }}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-all md:flex-none ${
                reportMode === "single"
                  ? "bg-[#5F30EB] text-white"
                  : "text-[#6A6A82] hover:bg-[#F8F7FF]"
              }`}
            >
              Single business
            </button>
            <button
              type="button"
              onClick={() => {
                setReportMode("comparison");
                clearMessages();
              }}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-all md:flex-none ${
                reportMode === "comparison"
                  ? "bg-[#5F30EB] text-white"
                  : "text-[#6A6A82] hover:bg-[#F8F7FF]"
              }`}
            >
              Compare businesses
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-[#E6E9F8] bg-white p-5">
          {loadingBusinesses ? (
            <div className="flex items-center gap-2 py-4">
              <svg
                className="animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6A6A82"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span className="text-sm text-[#6A6A82]">Loading businesses...</span>
            </div>
          ) : visibleBusinesses.length === 0 ? (
            <div className="py-6 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#E6E9F8"
                strokeWidth="2"
                className="mx-auto mb-3"
                aria-hidden="true"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="mb-3 text-sm text-[#6A6A82]">
                No connected businesses found.
              </p>
              <a
                href="/dashboard/settings"
                className="text-sm font-medium text-[#5F30EB] hover:underline"
              >
                Connect your Google Business in Settings
              </a>
            </div>
          ) : reportMode === "single" ? (
            <>
              <label className="mb-2 block text-sm font-medium text-[#040404]">
                Select Business
              </label>
              {visibleBusinesses.length === 1 ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[#5F30EB] bg-[#F0EBFF] p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5F30EB] text-xs font-bold text-white">
                    {selectedBusiness?.name?.charAt(0) || "B"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#040404]">
                      {selectedBusiness?.name || visibleBusinesses[0].name}
                    </p>
                    <p className="text-xs text-[#6A6A82]">
                      {selectedBusiness?.syncedReviewCount ??
                        visibleBusinesses[0].syncedReviewCount}{" "}
                      synced reviews
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
                        clearMessages();
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                        selectedBusiness?.id === biz.id
                          ? "border-[#5F30EB] bg-[#F0EBFF]"
                          : "border-[#E6E9F8] hover:border-[#5F30EB]/30 hover:bg-[#F8F7FF]"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                          selectedBusiness?.id === biz.id
                            ? "bg-[#5F30EB] text-white"
                            : "bg-[#F0EBFF] text-[#5F30EB]"
                        }`}
                      >
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
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label className="block text-sm font-medium text-[#040404]">
                  Select 2 or 3 Businesses
                </label>
                <span className="text-xs font-medium text-[#6A6A82]">
                  {selectedBusinessIds.length}/3 selected
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {visibleBusinesses.map((biz) => {
                  const selected = selectedBusinessIds.includes(biz.id);
                  const blocked = !selected && selectedBusinessIds.length >= 3;

                  return (
                    <button
                      key={biz.id}
                      type="button"
                      disabled={blocked}
                      onClick={() => toggleComparisonBusiness(biz.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected
                          ? "border-[#5F30EB] bg-[#F0EBFF]"
                          : "border-[#E6E9F8] hover:border-[#5F30EB]/30 hover:bg-[#F8F7FF]"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                          selected
                            ? "bg-[#5F30EB] text-white"
                            : "bg-[#F0EBFF] text-[#5F30EB]"
                        }`}
                      >
                        {selected ? "OK" : biz.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#040404]">
                          {biz.name}
                        </p>
                        <p className="text-xs text-[#6A6A82]">
                          {biz.syncedReviewCount} synced reviews
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {businesses.length < 2 && (
                <p className="mt-3 text-sm text-[#6A6A82]">
                  Connect at least two businesses to create a comparison.
                </p>
              )}
            </>
          )}

          {businesses.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6A6A82]">
                  Period
                </label>
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
                <label className="mb-1.5 block text-xs font-medium text-[#6A6A82]">
                  Report Language
                </label>
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
                    Arabic
                  </button>
                </div>
              </div>
            </div>
          )}

          {businesses.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  reportMode === "single"
                    ? void handleGenerateReport()
                    : void handleGenerateComparison()
                }
                disabled={generateButtonDisabled}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition-all ${
                  generateButtonDisabled
                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                    : "bg-[#5F30EB] text-white shadow-[0_4px_16px_rgba(95,48,235,0.24)] hover:bg-[#4a27c9]"
                }`}
              >
                {generating ? (
                  <>
                    <svg
                      className="animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M12 2v4" />
                      <path d="m6.34 7.34 2.83 2.83" />
                      <path d="M2 12h4" />
                      <path d="m17.66 7.34-2.83 2.83" />
                      <path d="M22 12h-4" />
                      <path d="M12 18v4" />
                      <path d="m6.34 16.66 2.83-2.83" />
                      <path d="m17.66 16.66-2.83-2.83" />
                    </svg>
                    {reportMode === "single" ? "Generate Report" : "Generate Comparison"}
                  </>
                )}
              </button>

              {reportMode === "single" && selectedBusiness && selectedBusinessReviewCount < 1 && (
                <p className="text-sm text-[#6A6A82]">
                  You do not have any reviews for this business yet.
                </p>
              )}
              {reportMode === "comparison" && selectedBusinessIds.length === 1 && (
                <p className="text-sm text-[#6A6A82]">
                  Select one more business to compare.
                </p>
              )}
              {reportMode === "comparison" &&
                comparisonHasValidSelection &&
                !comparisonHasEnoughReviews && (
                  <p className="text-sm text-[#6A6A82]">
                    Every selected business needs at least one synced review.
                  </p>
                )}
            </div>
          )}
          {generateError && <p className="mt-3 text-sm text-red-500">{generateError}</p>}
          {generateInfo && <p className="mt-3 text-sm text-[#6A6A82]">{generateInfo}</p>}
          {success && <p className="mt-3 text-sm text-green-500">{success}</p>}
        </div>

        {reportMode === "single" && selectedReport?.reportData && !generating && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#040404]">
                Latest Report
                {selectedReport.businessName ? ` - ${selectedReport.businessName}` : ""}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="text-xs text-[#6A6A82] transition-colors hover:text-[#5F30EB]"
              >
                Close
              </button>
            </div>
            <ReportCard report={selectedReport.reportData} />
          </div>
        )}

        {reportMode === "comparison" &&
          selectedComparisonReport?.reportData &&
          !generating && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#040404]">
                  Latest Comparison -{" "}
                  {selectedComparisonReport.businesses
                    .map((business) => business.name)
                    .join(" vs ")}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedComparisonReport(null)}
                  className="text-xs text-[#6A6A82] transition-colors hover:text-[#5F30EB]"
                >
                  Close
                </button>
              </div>
              <ComparisonReportCard report={selectedComparisonReport.reportData} />
            </div>
          )}

        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-[#040404]">Report History</h3>

          {loadingReports || loadingComparisonReports ? (
            <p className="text-sm text-[#6A6A82]">Loading reports...</p>
          ) : historyItems.length === 0 ? (
            <div className="py-8 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#E6E9F8"
                strokeWidth="2"
                className="mx-auto mb-3"
                aria-hidden="true"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm text-[#6A6A82]">
                No reports yet for the current business selection.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((report) => {
                const isComparison = report.type === "comparison";
                const title = isComparison
                  ? report.businesses.map((business) => business.name).join(" vs ")
                  : report.businessName || "Google Business";

                return (
                  <button
                    key={`${report.type}-${report.id}`}
                    type="button"
                    onClick={() =>
                      isComparison
                        ? void handleViewComparison(report)
                        : void handleViewReport(report)
                    }
                    className="flex w-full items-center justify-between rounded-2xl border border-[#E6E9F8] p-4 text-left transition-all hover:border-[#5F30EB]/30 hover:bg-[#F8F7FF]"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0EBFF] text-[#5F30EB]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          {isComparison ? (
                            <>
                              <rect x="3" y="4" width="7" height="16" rx="1" />
                              <rect x="14" y="4" width="7" height="16" rx="1" />
                            </>
                          ) : (
                            <>
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                              <polyline points="14 2 14 8 20 8" />
                            </>
                          )}
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-[#040404]">
                            {title}
                          </p>
                          {isComparison && (
                            <span className="rounded-full bg-[#F0EBFF] px-2 py-0.5 text-xs font-medium text-[#5F30EB]">
                              Comparison
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#6A6A82]">
                          {report.reviewCount} reviews |{" "}
                          {new Date(report.generatedAt).toLocaleDateString(undefined, {
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
                      className="shrink-0 text-[#6A6A82]"
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
