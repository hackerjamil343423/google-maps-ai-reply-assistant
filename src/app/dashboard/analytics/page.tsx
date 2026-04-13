"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import DashboardShell from "@/components/DashboardShell";
import { useLanguage } from "@/lib/i18n/language-context";
import type { AppLanguage } from "@/lib/i18n/types";

type ReviewStatus = "pending" | "auto" | "manual";

type ReviewItem = {
  id: string;
  rating: number;
  reviewedAt: string;
  status: ReviewStatus;
};

type ReviewsResponse = {
  reviews: ReviewItem[];
  summary: {
    total: number;
    avgRating: number;
    replied: number;
    pending: number;
    counts: {
      pending: number;
      auto: number;
      manual: number;
    };
  };
  analytics?: ApiAnalytics;
};

type RatingDistributionItem = {
  stars: number;
  count: number;
  pct: number;
};

type AnalyticsData = {
  stats: Array<{ label: string; value: number; suffix: string }>;
  monthLabels: string[];
  impactData: number[];
  reviewsData: number[];
  avgRating: number;
  responseRate: number;
  ratingDist: RatingDistributionItem[];
};

function buildMonthLabels(language: AppLanguage): string[] {
  const locale = language === "ar" ? "ar-EG" : "en-US";
  return Array.from({ length: 12 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - index));
    return new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
  });
}

function buildEmptyAnalytics(language: AppLanguage): AnalyticsData {
  return {
    stats: [
      { label: "Total Reviews", value: 0, suffix: "" },
      { label: "AI Reviews", value: 0, suffix: "" },
      { label: "Manual Reviews", value: 0, suffix: "" },
      { label: "Five Star Reviews", value: 0, suffix: "%" },
    ],
    monthLabels: buildMonthLabels(language),
    impactData: Array.from({ length: 12 }).map(() => 0),
    reviewsData: Array.from({ length: 12 }).map(() => 0),
    avgRating: 0,
    responseRate: 0,
    ratingDist: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, pct: 0 })),
  };
}

type ApiAnalytics = {
  fiveStarPct: number;
  monthly: Array<{ total: number; replied: number }>;
  ratingDist: RatingDistributionItem[];
};

function buildAnalyticsData(
  summary: ReviewsResponse["summary"],
  apiAnalytics: ApiAnalytics | undefined,
  language: AppLanguage,
): AnalyticsData {
  const totalReviews = summary.total;
  const responseRate = totalReviews > 0 ? Math.round((summary.replied / totalReviews) * 100) : 0;

  return {
    stats: [
      { label: "Total Reviews", value: totalReviews, suffix: "" },
      { label: "AI Reviews", value: summary.counts.auto, suffix: "" },
      { label: "Manual Reviews", value: summary.counts.manual, suffix: "" },
      { label: "Five Star Reviews", value: apiAnalytics?.fiveStarPct ?? 0, suffix: "%" },
    ],
    monthLabels: buildMonthLabels(language),
    impactData: apiAnalytics?.monthly.map((m) => m.replied) ?? Array.from({ length: 12 }).map(() => 0),
    reviewsData: apiAnalytics?.monthly.map((m) => m.total) ?? Array.from({ length: 12 }).map(() => 0),
    avgRating: summary.avgRating,
    responseRate,
    ratingDist: apiAnalytics?.ratingDist ?? [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, pct: 0 })),
  };
}

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = Math.max(target / 40, 1);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 30);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <>
      {display}
      {suffix}
    </>
  );
}

function LineChart({
  data,
  labels,
  color = "#5F30EB",
  height = 260,
}: {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 560;
  const H = height - 40;
  const PAD = 30;
  const min = 0;
  const max = Math.max(1, Math.max(...data) * 1.15);

  const points = data.map((value, index) => ({
    x: PAD + (index / (data.length - 1 || 1)) * (W - PAD * 2),
    y: H - ((value - min) / (max - min || 1)) * (H - PAD),
  }));

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${path} L ${points[points.length - 1]?.x ?? PAD} ${H} L ${points[0]?.x ?? PAD} ${H} Z`;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H + 40}`} className="w-full" style={{ height }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = H - t * (H - PAD);
        return (
          <g key={t}>
            <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="#5F30EB14" strokeWidth="1" />
            <text x={PAD - 6} y={y + 4} fontSize="9" fill="#666" textAnchor="end">
              {Math.round(min + t * (max - min))}
            </text>
          </g>
        );
      })}

      <defs>
        <linearGradient id="analyticsAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      <path d={area} fill="url(#analyticsAreaGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {points.map((point, index) => (
        <g
          key={index}
          onMouseEnter={() => setHovered(index)}
          onMouseLeave={() => setHovered(null)}
          style={{ cursor: "pointer" }}
        >
          <circle
            cx={point.x}
            cy={point.y}
            r={hovered === index ? 6 : 4}
            fill={hovered === index ? color : "#F6F4FF"}
            stroke={color}
            strokeWidth="2"
          />
          {hovered === index && (
            <g>
              <rect x={point.x - 32} y={point.y - 34} width="64" height="22" rx="4" fill="#F6F4FF" stroke={color} strokeWidth="1" />
              <text x={point.x} y={point.y - 19} textAnchor="middle" fontSize="11" fill={color} fontWeight="700">
                {data[index]}
              </text>
            </g>
          )}
        </g>
      ))}

      {points.map((point, index) => (
        <text key={index} x={point.x} y={H + 28} textAnchor="middle" fontSize="10" fill="#666">
          {labels[index]}
        </text>
      ))}
    </svg>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.floor(rating);
        const partial = !filled && star === Math.ceil(rating) && rating % 1 !== 0;

        return (
          <svg
            key={star}
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill={filled ? "#FFD700" : partial ? "url(#half)" : "none"}
            stroke="#FFD700"
            strokeWidth="1.5"
          >
            <defs>
              <linearGradient id="half" x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      })}
    </div>
  );
}

function RadialProgress({ value, size = 110 }: { value: number; size?: number }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, Math.min(value, 100)) / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E6E9F8" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#5F30EB"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-semibold text-[#5F30EB]">{value}%</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { language } = useLanguage();
  const [analytics, setAnalytics] = useState<AnalyticsData>(() =>
    buildEmptyAnalytics(language)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const maxMonthlyReviews = useMemo(() => {
    return Math.max(1, ...analytics.reviewsData);
  }, [analytics.reviewsData]);

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      setLoading(true);
      setError("");
      setAnalytics(buildEmptyAnalytics(language));

      const res = await fetch("/api/reviews?status=all&page=1&per_page=500&sort=newest", {
        cache: "no-store",
      });

      const json = (await res.json()) as ReviewsResponse & { error?: string };

      if (!active) return;

      if (!res.ok) {
        setError(json.error || "Failed to load analytics data.");
        setLoading(false);
        return;
      }

      setAnalytics(buildAnalyticsData(json.summary, json.analytics, language));
      setLoading(false);
    }

    void loadAnalytics();

    return () => {
      active = false;
    };
  }, [language]);

  return (
    <DashboardShell activeHref="/dashboard/analytics">
      <div>
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5F30EB]">Dashboard</p>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-[#040404]">Review Performance</h2>
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        {loading && <p className="text-sm text-[#6A6A82] mb-4">Loading analytics...</p>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {analytics.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-5 border border-[#2a2a2a] space-y-2"
                style={{
                  background: "rgba(255,255,255,0.82)",
                  boxShadow: "inset 0px -4px 40px 5px #0B385829",
                }}
              >
                <p className="text-[#040404] text-sm">{stat.label}</p>
                <h3 className="text-2xl md:text-4xl lg:text-5xl text-[#5F30EB] font-light tabular-nums">
                  <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                </h3>
              </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div
              className="lg:col-span-2 rounded-2xl border border-[#E6E9F8] p-4 md:p-6"
              style={{
                background: "rgba(255,255,255,0.82)",
                boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-[#6A6A82]">Monthly Replied Reviews</p>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#5F30EB] inline-block" />
                  <span className="text-xs text-[#6A6A82]">Replied Trend</span>
                </div>
              </div>
              <LineChart data={analytics.impactData} labels={analytics.monthLabels} color="#5F30EB" height={240} />
            </div>

            <div className="flex flex-col gap-4">
              <div
                className="rounded-2xl border border-[#E6E9F8] p-6 text-center flex-1 flex flex-col justify-center"
                style={{
                  background: "rgba(255,255,255,0.82)",
                  boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
                }}
              >
                <p className="text-sm text-[#6A6A82] mb-3">Average Rating</p>
                <StarDisplay rating={analytics.avgRating} />
                <h3 className="text-4xl font-semibold text-[#5F30EB] mt-3">{analytics.avgRating}</h3>
                <p className="text-xs text-[#8A8AA0] mt-1">out of 5.0</p>
              </div>

              <div
                className="rounded-2xl border border-[#E6E9F8] p-6 text-center flex-1 flex flex-col items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.82)",
                  boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
                }}
              >
                <p className="text-sm text-[#6A6A82] mb-3">Response Rate</p>
                <RadialProgress value={analytics.responseRate} size={110} />
              </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className="rounded-2xl border border-[#E6E9F8] p-4 md:p-6"
              style={{
                background: "rgba(255,255,255,0.82)",
                boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
              }}
            >
              <p className="text-sm text-[#6A6A82] mb-4">Monthly Reviews</p>
              <div className="flex items-end gap-2 h-32">
                {analytics.reviewsData.map((value, index) => {
                  const pct = (value / maxMonthlyReviews) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full rounded-t-md transition-all duration-300 group-hover:opacity-80"
                        style={{
                          height: `${pct}%`,
                          background: "linear-gradient(to top, #5F30EB, #00E0FF)",
                          minHeight: 4,
                        }}
                        title={`${analytics.monthLabels[index]}: ${value}`}
                      />
                      <span className="text-[9px] text-gray-600">{analytics.monthLabels[index]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-2xl border border-[#E6E9F8] p-4 md:p-6"
              style={{
                background: "rgba(255,255,255,0.82)",
                boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
              }}
            >
              <p className="text-sm text-[#6A6A82] mb-4">Rating Distribution</p>
              <div className="space-y-3">
                {analytics.ratingDist.map((item) => (
                  <div key={item.stars} className="flex items-center gap-3">
                    <span className="text-xs text-[#6A6A82] w-8 flex-shrink-0">{item.stars}*</span>
                    <div className="flex-1 bg-[#E6E9F8] rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{
                          width: `${item.pct}%`,
                          background:
                            item.stars >= 4 ? "#5F30EB" : item.stars === 3 ? "#D97706" : "#EF4444",
                        }}
                      />
                    </div>
                    <span className="text-xs text-[#8A8AA0] w-8 text-right flex-shrink-0">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
        </div>
      </div>
    </DashboardShell>
  );
}

