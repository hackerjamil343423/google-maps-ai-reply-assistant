"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "@/components/DashboardShell";
import ReportCard from "@/components/dashboard/analytics/reports/ReportCard";
import type { ReportDetail } from "@/components/dashboard/analytics/reports/ReportCard";

type BusinessSuggestion = {
  id: string;
  name: string;
  address: string;
  label: string;
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
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<BusinessSuggestion[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessSuggestion | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [generateError, setGenerateError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<"this_week" | "last_week" | "this_month" | "last_month" | "last_3_months" | "specific">("this_month");
  const [specificYear, setSpecificYear] = useState(new Date().getFullYear());
  const [specificMonth, setSpecificMonth] = useState(new Date().getMonth() + 1);
  const [reportLanguage, setReportLanguage] = useState<"en" | "ar">("en");

  const router = useRouter();
  const searchRequestIdRef = useRef(0);

  // Load report history on mount
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

  const fetchSearchResults = useCallback(async (query: string) => {
    const res = await fetch(
      `/api/public/business-search?q=${encodeURIComponent(query)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json() as { results?: BusinessSuggestion[] };
    return json.results ?? [];
  }, []);

  const handleGenerateReport = useCallback(async () => {
    if (!selectedBusiness) return;

    setGenerating(true);
    setGenerateError("");
    setSuccess("");
    setSelectedReport(null);

    try {
      const res = await fetch("/api/analytics/reports/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: selectedBusiness.id,
          period: selectedPeriod,
          year: selectedPeriod === "specific" ? specificYear : undefined,
          month: selectedPeriod === "specific" ? specificMonth : undefined,
          language: reportLanguage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
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
      setSelectedBusiness(null);
      setSearchValue("");
      setSearchResults([]);
      setSuccess(`Report generated for "${data.businessName}" with ${data.reviewCount} reviews!`);
      setSelectedReport({ ...newReport, reportData: data.reportData });
    } catch {
      setGenerateError("An error occurred. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [selectedBusiness, selectedPeriod, specificYear, specificMonth, reportLanguage]);

  // Debounced search
  useEffect(() => {
    const query = searchValue.trim();

    if (selectedBusiness && query === selectedBusiness.label) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    const timer = setTimeout(() => {
      setSearchLoading(true);
      void fetchSearchResults(query)
        .then((results) => {
          if (requestId !== searchRequestIdRef.current) return;
          setSearchResults(results);
        })
        .catch(() => {
          if (requestId !== searchRequestIdRef.current) return;
          setSearchResults([]);
        })
        .finally(() => {
          if (requestId !== searchRequestIdRef.current) return;
          setSearchLoading(false);
        });
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [searchValue, selectedBusiness, fetchSearchResults]);

  const handleSelectBusiness = useCallback((business: BusinessSuggestion) => {
    setSearchValue(business.label);
    setSelectedBusiness(business);
    setSearchResults([]);
    setSearchError("");
    setGenerateError("");
  }, []);

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
            Search for any business below to generate an AI-powered analysis report of its Google reviews.
          </p>
        </div>

        {/* Search Input Card */}
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5 mb-6">
          <label className="block text-sm font-medium text-[#040404] mb-2">
            Search Business
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => {
                const val = e.target.value;
                setSearchValue(val);
                if (selectedBusiness && val !== selectedBusiness.label) {
                  setSelectedBusiness(null);
                }
                setGenerateError("");
              }}
              placeholder="Type a business name and address..."
              className="w-full rounded-2xl border border-[#E6E9F8] bg-white px-4 py-3 text-sm text-[#4F4A63] outline-none transition-all focus:border-[#5F30EB]/35 focus:ring-2 focus:ring-[#5F30EB]/12 pr-10"
            />
            {searchLoading && (
              <svg className="animate-spin absolute right-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6A6A82" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-1 border border-[#E6E9F8] rounded-2xl overflow-hidden bg-white shadow-lg">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelectBusiness(result)}
                  className="w-full border-t border-[#5F30EB14] px-4 py-3 text-left transition-colors hover:bg-[#EEF2FF] last:border-b-0"
                >
                  <p className="text-sm font-medium text-[#040404]">{result.name}</p>
                  {result.address && (
                    <p className="text-xs text-[#6A6A82] mt-0.5">{result.address}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {searchError && <p className="text-sm text-red-500 mt-2">{searchError}</p>}

          {/* Period & Language Controls */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Period Selector */}
            <div>
              <label className="block text-xs font-medium text-[#6A6A82] mb-1.5">Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as typeof selectedPeriod)}
                className="w-full rounded-2xl border border-[#E6E9F8] bg-white px-3 py-2.5 text-sm text-[#4F4A63] outline-none focus:border-[#5F30EB]/35 focus:ring-2 focus:ring-[#5F30EB]/12"
              >
                <option value="this_week">This Week (Mon–Today)</option>
                <option value="last_week">Last Week (Mon–Sun)</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="specific">Specific Month</option>
              </select>

              {selectedPeriod === "specific" && (
                <div className="flex gap-2 mt-2">
                  <select
                    value={specificMonth}
                    onChange={(e) => setSpecificMonth(Number(e.target.value))}
                    className="flex-1 rounded-2xl border border-[#E6E9F8] bg-white px-3 py-2 text-sm text-[#4F4A63] outline-none focus:border-[#5F30EB]/35"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleString("en", { month: "long" })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={specificYear}
                    onChange={(e) => setSpecificYear(Number(e.target.value))}
                    className="w-24 rounded-2xl border border-[#E6E9F8] bg-white px-3 py-2 text-sm text-[#4F4A63] outline-none focus:border-[#5F30EB]/35"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Language Selector */}
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
                  🇬🇧 English
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
                  🇸🇦 العربية
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleGenerateReport()}
              disabled={!selectedBusiness || generating}
              className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition-all ${
                !selectedBusiness || generating
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
            {selectedBusiness && (
              <span className="text-sm text-[#6A6A82]">
                Selected: <span className="font-medium text-[#040404]">{selectedBusiness.name}</span>
              </span>
            )}
          </div>
          {generateError && <p className="text-sm text-red-500 mt-3">{generateError}</p>}
          {success && <p className="text-sm text-green-500 mt-3">{success}</p>}
        </div>

        {/* Most Recent Report (quick view) */}
        {selectedReport?.reportData && !generating && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#040404]">
                Latest Report{selectedReport.businessName ? ` — ${selectedReport.businessName}` : ""}
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

        {/* Report History */}
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
          <h3 className="text-sm font-semibold text-[#040404] mb-4">Report History</h3>

          {loadingReports ? (
            <p className="text-sm text-[#6A6A82]">Loading reports...</p>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E6E9F8" strokeWidth="2" className="mx-auto mb-3" aria-hidden="true">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm text-[#6A6A82]">No reports yet. Search for a business above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
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
