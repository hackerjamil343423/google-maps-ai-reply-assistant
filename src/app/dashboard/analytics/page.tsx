"use client";

import { useState, useEffect, useRef } from "react";
import DashboardShell from "@/components/DashboardShell";

/* ─── Mock data ──────────────────────────────────────────── */
const STATS = [
  { label: "Total Reviews", value: 147, suffix: "", trend: "20.0+" },
  { label: "AI Reviews",    value: 112, suffix: "", trend: "20.0+" },
  { label: "Manual Reviews",value: 35,  suffix: "", trend: "20.0+" },
  { label: "Five Star Reviews", value: 68, suffix: "%", trend: "20.0+" },
];

// Monthly impact trend data (last 12 months)
const MONTHS = ["Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb"];
const IMPACT_DATA = [30, 42, 38, 55, 60, 72, 65, 80, 74, 88, 82, 95];
const REVIEWS_DATA = [8, 12, 10, 15, 18, 22, 19, 25, 21, 28, 24, 30];

const AVG_RATING = 4.3;
const RESPONSE_RATE = 92;

/* ─── Animated counter ───────────────────────────────────── */
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return <>{display}{suffix}</>;
}

/* ─── SVG Line Chart ─────────────────────────────────────── */
function LineChart({ data, color = "#00FFE9", height = 260 }: {
  data: number[]; color?: string; height?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 560; const H = height - 40; const PAD = 30;
  const min = 0; const max = Math.max(...data) * 1.15;
  const pts = data.map((v, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: H - ((v - min) / (max - min)) * (H - PAD),
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H + 40}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = H - t * (H - PAD);
        return (
          <g key={t}>
            <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="#ffffff08" strokeWidth="1" />
            <text x={PAD - 6} y={y + 4} fontSize="9" fill="#666" textAnchor="end">
              {Math.round(min + t * (max - min))}
            </text>
          </g>
        );
      })}
      {/* Area fill */}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />
      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots + hover */}
      {pts.map((p, i) => (
        <g key={i}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{ cursor: "pointer" }}>
          <circle cx={p.x} cy={p.y} r={hovered === i ? 6 : 4}
            fill={hovered === i ? color : "#0B090A"}
            stroke={color} strokeWidth="2" />
          {hovered === i && (
            <g>
              <rect x={p.x - 32} y={p.y - 34} width="64" height="22" rx="4"
                fill="#0B090A" stroke={color} strokeWidth="1" />
              <text x={p.x} y={p.y - 19} textAnchor="middle" fontSize="11" fill={color} fontWeight="700">
                {data[i]}
              </text>
            </g>
          )}
        </g>
      ))}
      {/* X labels */}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={H + 28} textAnchor="middle" fontSize="10" fill="#666">
          {MONTHS[i]}
        </text>
      ))}
    </svg>
  );
}

/* ─── Star rating display ────────────────────────────────── */
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = s <= Math.floor(rating);
        const partial = !filled && s === Math.ceil(rating);
        return (
          <svg key={s} xmlns="http://www.w3.org/2000/svg" width="28" height="28"
            viewBox="0 0 24 24" aria-hidden="true"
            fill={filled ? "#FFD700" : partial ? "url(#half)" : "none"}
            stroke="#FFD700" strokeWidth="1.5">
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

/* ─── Radial progress ────────────────────────────────────── */
function RadialProgress({ value, max = 100, color = "#00FFE9", size = 120 }: {
  value: number; max?: number; color?: string; size?: number;
}) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f1f1f" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${pct * circ} ${circ}`}
        strokeDashoffset={0} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fontSize="20" fontWeight="700" fill={color}>
        {value}%
      </text>
    </svg>
  );
}

/* ─── Rating bar ─────────────────────────────────────────── */
const RATING_DIST = [
  { stars: 5, count: 82, pct: 56 },
  { stars: 4, count: 38, pct: 26 },
  { stars: 3, count: 15, pct: 10 },
  { stars: 2, count: 8,  pct: 5  },
  { stars: 1, count: 4,  pct: 3  },
];

/* ─── Page ───────────────────────────────────────────────── */
export default function AnalyticsPage() {
  return (
    <DashboardShell activeHref="/dashboard/analytics">
      <div className="h-full">
        <div
          className="rounded-3xl border border-[#1f1f1f] p-4 md:p-10 min-h-[70vh] max-h-[calc(100vh-120px)] overflow-y-auto backdrop-blur-[80px]"
          style={{
            background: "rgba(11,9,10,0.2)",
            boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
          }}
        >
          <h2 className="text-xl md:text-2xl font-medium mb-6">Analytics</h2>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {STATS.map((s) => (
              <div key={s.label}
                className="rounded-2xl p-5 border border-[#2a2a2a] space-y-2"
                style={{
                  background: "rgba(11,9,10,0.2)",
                  boxShadow: "inset 0px -4px 40px 5px #0B385829",
                }}>
                <p className="text-white text-sm">{s.label}</p>
                <div className="flex justify-between items-end">
                  <h3 className="text-2xl md:text-4xl lg:text-5xl text-[#00FFE9] font-light tabular-nums">
                    <AnimatedNumber target={s.value} suffix={s.suffix} />
                  </h3>
                  <p className="text-xs text-gray-500 mb-1">{s.trend}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Impact trend chart — 2 cols */}
            <div className="lg:col-span-2 rounded-2xl border border-[#1f1f1f] p-4 md:p-6"
              style={{
                background: "rgba(11,9,10,0.2)",
                boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
              }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">Impact on Business</p>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#00FFE9] inline-block" />
                  <span className="text-xs text-gray-400">Impact Trend</span>
                </div>
              </div>
              <LineChart data={IMPACT_DATA} color="#00FFE9" height={240} />
            </div>

            {/* Average rating + response rate — 1 col */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-[#1f1f1f] p-6 text-center flex-1 flex flex-col justify-center"
                style={{
                  background: "rgba(11,9,10,0.2)",
                  boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
                }}>
                <p className="text-sm text-gray-400 mb-3">Average Rating</p>
                <StarDisplay rating={AVG_RATING} />
                <h3 className="text-4xl font-semibold text-[#00FFE9] mt-3">{AVG_RATING}</h3>
                <p className="text-xs text-gray-500 mt-1">out of 5.0</p>
              </div>

              <div className="rounded-2xl border border-[#1f1f1f] p-6 text-center flex-1 flex flex-col items-center justify-center"
                style={{
                  background: "rgba(11,9,10,0.2)",
                  boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
                }}>
                <p className="text-sm text-gray-400 mb-3">Response Rate</p>
                <RadialProgress value={RESPONSE_RATE} size={110} />
              </div>
            </div>
          </div>

          {/* ── Bottom row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly reviews bar chart */}
            <div className="rounded-2xl border border-[#1f1f1f] p-4 md:p-6"
              style={{
                background: "rgba(11,9,10,0.2)",
                boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
              }}>
              <p className="text-sm text-gray-400 mb-4">Monthly Reviews</p>
              <div className="flex items-end gap-2 h-32">
                {REVIEWS_DATA.map((v, i) => {
                  const maxV = Math.max(...REVIEWS_DATA);
                  const pct = (v / maxV) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full rounded-t-md transition-all duration-300 group-hover:opacity-80"
                        style={{
                          height: `${pct}%`,
                          background: "linear-gradient(to top, #00FFE9, #00B4D8)",
                          minHeight: 4,
                        }}
                        title={`${MONTHS[i]}: ${v}`}
                      />
                      <span className="text-[9px] text-gray-600">{MONTHS[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rating distribution */}
            <div className="rounded-2xl border border-[#1f1f1f] p-4 md:p-6"
              style={{
                background: "rgba(11,9,10,0.2)",
                boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
              }}>
              <p className="text-sm text-gray-400 mb-4">Rating Distribution</p>
              <div className="space-y-3">
                {RATING_DIST.map((r) => (
                  <div key={r.stars} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-8 flex-shrink-0">{r.stars}★</span>
                    <div className="flex-1 bg-[#1f1f1f] rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{
                          width: `${r.pct}%`,
                          background: r.stars >= 4 ? "#00FFE9" : r.stars === 3 ? "#D97706" : "#EF4444",
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right flex-shrink-0">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
