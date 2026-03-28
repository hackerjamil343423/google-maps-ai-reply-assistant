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

export type ReportData = {
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

export type ReportDetail = {
  id: string;
  businessId: string;
  businessName?: string;
  generatedAt: string;
  reviewCount: number;
  periodStart: string;
  periodEnd: string;
  reportData: ReportData;
};

export default function ReportCard({ report }: { report: ReportData }) {
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
