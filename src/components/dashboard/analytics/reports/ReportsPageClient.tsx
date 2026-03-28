"use client";

import { useEffect, useState } from "react";

import DashboardShell from "@/components/DashboardShell";

type Business = {
  id: string;
  name: string;
  googleLocationId: string | null;
  connectedAt: string | null;
};

type ReportSummary = {
  id: string;
  businessId: string;
  generatedAt: string;
  reviewCount: number;
  periodStart: string;
  periodEnd: string;
};

type ReportData = {
  overall: {
    totalReviews: number;
    averageRating: number;
    sentimentBreakdown: { positive: number; neutral: number; negative: number };
    ratingDistribution: Record<string, number>;
  };
  commonThemes: Array<{ theme: string; count: number; examples: string[] }>;
  keyPhrases: string[];
  trends: { periodOverPeriod: "improving" | "declining" | "stable"; changePercent: number };
  insights: string[];
  responseStats: { totalReplied: number; replyRatePercent: number };
};

type ReportDetail = ReportSummary & {
  reportData: ReportData;
};

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "#FFD700" : "none"}
      stroke="#FFD700"
      strokeWidth="2"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function TrendIcon({ direction }: { direction: "improving" | "declining" | "stable" }) {
  if (direction === "improving") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    );
  }
  if (direction === "declining") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" aria-hidden="true">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ReportCard({ report }: { report: ReportData }) {
  const { overall, trends, responseStats } = report;
  const sentimentTotal = overall.sentimentBreakdown.positive + overall.sentimentBreakdown.neutral + overall.sentimentBreakdown.negative;

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-4 text-center">
          <p className="text-xs text-[#6A6A82] mb-1">Total Reviews</p>
          <p className="text-2xl font-semibold text-[#5F30EB]">{overall.totalReviews}</p>
        </div>
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-4 text-center">
          <p className="text-xs text-[#6A6A82] mb-1">Avg Rating</p>
          <p className="text-2xl font-semibold text-[#5F30EB]">{overall.averageRating}</p>
          <div className="flex justify-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon key={star} filled={star <= Math.round(overall.averageRating)} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-4 text-center">
          <p className="text-xs text-[#6A6A82] mb-1">Reply Rate</p>
          <p className="text-2xl font-semibold text-[#5F30EB]">{responseStats.replyRatePercent}%</p>
          <p className="text-xs text-[#6A6A82] mt-1">{responseStats.totalReplied} replied</p>
        </div>
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-4 text-center">
          <p className="text-xs text-[#6A6A82] mb-1">Trend</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <TrendIcon direction={trends.periodOverPeriod} />
            <span className={`text-lg font-semibold ${
              trends.periodOverPeriod === "improving" ? "text-green-500" :
              trends.periodOverPeriod === "declining" ? "text-red-500" : "text-gray-500"
            }`}>
              {trends.periodOverPeriod.charAt(0).toUpperCase() + trends.periodOverPeriod.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment & Rating Distribution */}
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
          <h3 className="text-sm font-semibold text-[#040404] mb-4">Sentiment Breakdown</h3>
          <div className="space-y-3">
            {(["positive", "neutral", "negative"] as const).map((sentiment) => {
              const count = overall.sentimentBreakdown[sentiment];
              const pct = sentimentTotal > 0 ? Math.round((count / sentimentTotal) * 100) : 0;
              const color = sentiment === "positive" ? "#22c55e" : sentiment === "neutral" ? "#f59e0b" : "#ef4444";
              return (
                <div key={sentiment} className="flex items-center gap-3">
                  <span className="text-xs text-[#6A6A82] w-16 capitalize">{sentiment}</span>
                  <div className="flex-1 bg-[#E6E9F8] rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-xs font-medium text-[#040404] w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>

          <h3 className="text-sm font-semibold text-[#040404] mb-3 mt-6">Rating Distribution</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = overall.ratingDistribution[String(star)] || 0;
              const pct = overall.totalReviews > 0 ? Math.round((count / overall.totalReviews) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs text-[#6A6A82] w-8">{star}*</span>
                  <div className="flex-1 bg-[#E6E9F8] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: star >= 4 ? "#5F30EB" : star === 3 ? "#f59e0b" : "#ef4444" }}
                    />
                  </div>
                  <span className="text-xs text-[#8A8AA0] w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Common Themes */}
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
          <h3 className="text-sm font-semibold text-[#040404] mb-4">Common Themes</h3>
          {report.commonThemes.length === 0 ? (
            <p className="text-sm text-[#6A6A82]">No themes identified</p>
          ) : (
            <div className="space-y-4">
              {report.commonThemes.slice(0, 5).map((theme, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#040404]">{theme.theme}</span>
                    <span className="text-xs text-[#6A6A82]">{theme.count} mentions</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {theme.examples.slice(0, 2).map((ex, i) => (
                      <span key={i} className="text-xs bg-[#F0EBFF] text-[#5F30EB] px-2 py-1 rounded-lg">
                        &ldquo;{ex.substring(0, 60)}...&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key Phrases */}
      {report.keyPhrases.length > 0 && (
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
          <h3 className="text-sm font-semibold text-[#040404] mb-4">Key Review Phrases</h3>
          <div className="flex flex-wrap gap-2">
            {report.keyPhrases.map((phrase, idx) => (
              <span key={idx} className="text-sm bg-[#F0EBFF] text-[#5F30EB] px-3 py-1.5 rounded-xl">
                &ldquo;{phrase}&rdquo;
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {report.insights.length > 0 && (
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
          <h3 className="text-sm font-semibold text-[#040404] mb-4">AI Insights & Recommendations</h3>
          <ul className="space-y-2">
            {report.insights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-[#4F4A67]">
                <span className="text-[#5F30EB] mt-0.5">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ReportsPageClient() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [canGenerate, setCanGenerate] = useState(true);
  const [canGenerateReason, setCanGenerateReason] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  // Load businesses
  useEffect(() => {
    let mounted = true;
    setLoadingBusinesses(true);
    void fetch("/api/analytics/businesses", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ businesses: Business[] }>;
      })
      .then((data) => {
        if (!mounted || !data) return;
        setBusinesses(data.businesses);
        if (data.businesses.length > 0 && !selectedBusinessId) {
          setSelectedBusinessId(data.businesses[0].id);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingBusinesses(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Load reports when business changes
  useEffect(() => {
    if (!selectedBusinessId) return;
    let mounted = true;
    setLoadingReports(true);
    setReports([]);
    setSelectedReport(null);

    void fetch(`/api/analytics/reports?businessId=${selectedBusinessId}`, { cache: "no-store" })
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
  }, [selectedBusinessId]);

  // Check if can generate
  useEffect(() => {
    if (!selectedBusinessId) return;
    let mounted = true;
    setCanGenerate(true);
    setCanGenerateReason("");

    void fetch(`/api/analytics/reports/${selectedBusinessId}/can-generate`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ canGenerate: boolean; reason?: string }>;
      })
      .then((data) => {
        if (!mounted) return;
        if (data) {
          setCanGenerate(data.canGenerate);
          setCanGenerateReason(data.reason || "");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setGenerating(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedBusinessId, generating]);

  async function handleGenerateReport() {
    if (!selectedBusinessId || !canGenerate) return;

    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/analytics/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: selectedBusinessId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate report");
        if (res.status === 429) {
          setCanGenerate(false);
          setCanGenerateReason(data.nextAvailable ? `Next available: ${new Date(data.nextAvailable).toLocaleDateString()}` : "Limit reached");
        }
        return;
      }

      // Add new report to list
      const newReport: ReportSummary = {
        id: data.id,
        businessId: data.businessId,
        generatedAt: data.generatedAt,
        reviewCount: data.reviewCount,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      };

      setReports((prev) => [newReport, ...prev]);
      setCanGenerate(false);
      setCanGenerateReason("Report generated. Next available next month.");
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleViewReport(reportId: string) {
    if (selectedReport?.id === reportId) {
      setSelectedReport(null);
      return;
    }

    setLoadingDetail(true);
    setSelectedReport(null);

    try {
      const res = await fetch(`/api/analytics/reports/${reportId}`, { cache: "no-store" });
      const data = await res.json();

      if (res.ok) {
        setSelectedReport(data as ReportDetail);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingDetail(false);
    }
  }

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);

  return (
    <DashboardShell activeHref="/dashboard/analytics/reports">
      <div>
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5F30EB]">Analytics</p>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-[#040404]">Reviews Analysis</h2>
          <p className="mt-2 text-sm text-[#6A6A82]">
            Generate AI-powered analysis reports for your Google Business reviews.
          </p>
        </div>

        {/* Business Selector */}
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5 mb-6">
          <label className="block text-sm font-medium text-[#040404] mb-2">
            Select Business
          </label>
          {loadingBusinesses ? (
            <p className="text-sm text-[#6A6A82]">Loading businesses...</p>
          ) : businesses.length === 0 ? (
            <p className="text-sm text-[#6A6A82]">No connected businesses found.</p>
          ) : (
            <select
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="w-full rounded-2xl border border-[#E6E9F8] bg-white px-4 py-3 text-sm text-[#4F4F63] outline-none focus:border-[#5F30EB]/35 focus:ring-2 focus:ring-[#5F30EB]/12"
            >
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>
                  {biz.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Generate Report Card */}
        {selectedBusinessId && (
          <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#040404]">
                  {selectedBusiness?.name || "Business"} — Analysis Report
                </h3>
                <p className="text-xs text-[#6A6A82] mt-1">
                  {canGenerate
                    ? "Generate a comprehensive AI-powered analysis of all reviews."
                    : canGenerateReason}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleGenerateReport()}
                disabled={!canGenerate || generating || loadingBusinesses}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition-all ${
                  !canGenerate || generating
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
            </div>
            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
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
              <p className="text-sm text-[#6A6A82]">No reports yet. Generate your first report above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const isSelected = selectedReport?.id === report.id;
                return (
                  <div key={report.id}>
                    <button
                      type="button"
                      onClick={() => void handleViewReport(report.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                        isSelected
                          ? "border-[#5F30EB] bg-[#F0EBFF]"
                          : "border-[#E6E9F8] hover:border-[#5F30EB]/30 hover:bg-[#F8F7FF]"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected ? "bg-[#5F30EB] text-white" : "bg-[#F0EBFF] text-[#5F30EB]"
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#040404]">
                            {new Date(report.generatedAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-[#6A6A82] mt-0.5">
                            {report.reviewCount} reviews analyzed &bull; Period: {new Date(report.periodStart).toLocaleDateString()} – {new Date(report.periodEnd).toLocaleDateString()}
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
                        className={`text-[#6A6A82] transition-transform ${isSelected ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {isSelected && (
                      <div className="mt-3 pl-4 border-l-2 border-[#5F30EB]/20">
                        {loadingDetail ? (
                          <div className="flex items-center gap-2 p-4">
                            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            <span className="text-sm text-[#6A6A82]">Loading report...</span>
                          </div>
                        ) : selectedReport?.reportData ? (
                          <ReportCard report={selectedReport.reportData} />
                        ) : (
                          <p className="text-sm text-[#6A6A82] p-4">Failed to load report data.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
