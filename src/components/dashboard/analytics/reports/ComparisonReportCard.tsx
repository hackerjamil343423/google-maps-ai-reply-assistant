import type { ComparisonReportData } from "@/lib/ai/generate-comparison-report";

function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function trendLabel(direction: "improving" | "declining" | "stable") {
  if (direction === "improving") return "Improving";
  if (direction === "declining") return "Declining";
  return "Stable";
}

function trendClass(direction: "improving" | "declining" | "stable") {
  if (direction === "improving") return "text-green-600 bg-green-50";
  if (direction === "declining") return "text-red-600 bg-red-50";
  return "text-gray-600 bg-gray-50";
}

function priorityClass(priority: "high" | "medium" | "low") {
  if (priority === "high") return "bg-red-50 text-red-600 border-red-100";
  if (priority === "medium") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-green-50 text-green-700 border-green-100";
}

function sentimentPercent(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

export default function ComparisonReportCard({
  report,
}: {
  report: ComparisonReportData;
}) {
  const businesses = report.businesses ?? [];
  const isAr = isArabicText(
    [
      report.executiveSummary,
      ...(report.sharedThemes ?? []),
      ...(report.recommendations ?? []).map((item) => item.recommendation),
    ].join(" ")
  );

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5F30EB]">
          AI Comparison
        </p>
        <h3 className="mt-2 text-lg font-semibold text-[#040404]">
          Executive Summary
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#4F4A67]">
          {report.executiveSummary}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {businesses.map((business) => (
          <div
            key={business.businessId}
            className="rounded-2xl border border-[#E6E9F8] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#040404]">
                  {business.businessName}
                </p>
                <p className="mt-1 text-xs text-[#6A6A82]">
                  {business.totalReviews} reviews
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${trendClass(
                  business.trends.periodOverPeriod
                )}`}
              >
                {trendLabel(business.trends.periodOverPeriod)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-[#6A6A82]">Avg rating</p>
                <p className="mt-1 text-xl font-semibold text-[#5F30EB]">
                  {business.averageRating}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6A6A82]">Reply rate</p>
                <p className="mt-1 text-xl font-semibold text-[#5F30EB]">
                  {business.responseStats.replyRatePercent}%
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {(["positive", "neutral", "negative"] as const).map((sentiment) => {
                const count = business.sentimentBreakdown[sentiment];
                const pct = sentimentPercent(count, business.totalReviews);
                const color =
                  sentiment === "positive"
                    ? "#22c55e"
                    : sentiment === "neutral"
                      ? "#f59e0b"
                      : "#ef4444";

                return (
                  <div key={sentiment} className="flex items-center gap-2">
                    <span className="w-16 text-xs capitalize text-[#6A6A82]">
                      {sentiment}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E6E9F8]">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="w-9 text-right text-xs font-medium text-[#040404]">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
        <h3 className="text-sm font-semibold text-[#040404]">Metric Table</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E6E9F8] text-xs text-[#6A6A82]">
                <th className="py-3 pr-4 font-medium">Business</th>
                <th className="py-3 pr-4 font-medium">Reviews</th>
                <th className="py-3 pr-4 font-medium">Avg rating</th>
                <th className="py-3 pr-4 font-medium">Reply rate</th>
                <th className="py-3 pr-4 font-medium">Positive</th>
                <th className="py-3 pr-4 font-medium">Neutral</th>
                <th className="py-3 pr-4 font-medium">Negative</th>
                <th className="py-3 pr-4 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((business) => (
                <tr
                  key={business.businessId}
                  className="border-b border-[#F1F2F8] last:border-0"
                >
                  <td className="py-3 pr-4 font-medium text-[#040404]">
                    {business.businessName}
                  </td>
                  <td className="py-3 pr-4 text-[#4F4A67]">
                    {business.totalReviews}
                  </td>
                  <td className="py-3 pr-4 text-[#4F4A67]">
                    {business.averageRating}
                  </td>
                  <td className="py-3 pr-4 text-[#4F4A67]">
                    {business.responseStats.replyRatePercent}%
                  </td>
                  <td className="py-3 pr-4 text-[#4F4A67]">
                    {business.sentimentBreakdown.positive}
                  </td>
                  <td className="py-3 pr-4 text-[#4F4A67]">
                    {business.sentimentBreakdown.neutral}
                  </td>
                  <td className="py-3 pr-4 text-[#4F4A67]">
                    {business.sentimentBreakdown.negative}
                  </td>
                  <td className="py-3 pr-4 text-[#4F4A67]">
                    {trendLabel(business.trends.periodOverPeriod)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {report.metricLeaders?.length > 0 && (
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
          <h3 className="text-sm font-semibold text-[#040404]">Metric Leaders</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {report.metricLeaders.map((leader, index) => (
              <div
                key={`${leader.metric}-${index}`}
                className="rounded-xl border border-[#E6E9F8] bg-[#FBFBFF] p-4"
              >
                <p className="text-xs font-medium text-[#6A6A82]">
                  {leader.metric}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#040404]">
                  {leader.businessName}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4F4A67]">
                  {leader.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.sharedThemes?.length > 0 && (
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
          <h3 className="text-sm font-semibold text-[#040404]">Shared Themes</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {report.sharedThemes.map((theme, index) => (
              <span
                key={`${theme}-${index}`}
                className="rounded-xl bg-[#F0EBFF] px-3 py-1.5 text-sm text-[#5F30EB]"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {report.businessStrengths?.length > 0 && (
          <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
            <h3 className="text-sm font-semibold text-[#040404]">
              Business Strengths
            </h3>
            <div className="mt-4 space-y-4">
              {report.businessStrengths.map((item) => (
                <div key={item.businessId}>
                  <p className="text-sm font-medium text-[#040404]">
                    {item.businessName}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {item.strengths.map((strength, index) => (
                      <li
                        key={`${item.businessId}-strength-${index}`}
                        className="text-sm leading-6 text-[#4F4A67]"
                      >
                        <span className="text-[#5F30EB]">- </span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.risks?.length > 0 && (
          <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
            <h3 className="text-sm font-semibold text-[#040404]">
              Risks And Weak Spots
            </h3>
            <div className="mt-4 space-y-4">
              {report.risks.map((item) => (
                <div key={item.businessId}>
                  <p className="text-sm font-medium text-[#040404]">
                    {item.businessName}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {item.risks.map((risk, index) => (
                      <li
                        key={`${item.businessId}-risk-${index}`}
                        className="text-sm leading-6 text-[#4F4A67]"
                      >
                        <span className="text-red-500">- </span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {report.recommendations?.length > 0 && (
        <div className="rounded-2xl border border-[#E6E9F8] bg-white p-5">
          <h3 className="text-sm font-semibold text-[#040404]">
            Prioritized Recommendations
          </h3>
          <div className="mt-4 space-y-3">
            {report.recommendations.map((item, index) => (
              <div
                key={`${item.priority}-${index}`}
                className="rounded-xl border border-[#E6E9F8] bg-[#FBFBFF] p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${priorityClass(
                      item.priority
                    )}`}
                  >
                    {item.priority}
                  </span>
                  {item.businessName && (
                    <span className="text-xs font-medium text-[#6A6A82]">
                      {item.businessName}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-6 text-[#4F4A67]">
                  {item.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
