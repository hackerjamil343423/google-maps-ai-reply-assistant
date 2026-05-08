"use client";

import { useEffect, useState } from "react";

type Stats = {
  totalUsers: number;
  activeSubscriptions: number;
  totalBusinesses: number;
  totalReviews: number;
};

type Signup = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type PlanDist = {
  plan: string;
  count: number;
};

type GrowthRow = {
  month: string;
  count: number;
};

type UsageStats = {
  totalReviewsManaged: number;
  totalAiReplies: number;
  totalManualReplies: number;
};

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E6E1FA] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#9490A8]">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#040404]">{value}</p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [planDist, setPlanDist] = useState<PlanDist[]>([]);
  const [growth, setGrowth] = useState<GrowthRow[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/dashboard/stats").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/dashboard/recent-signups").then((r) => r.json()).catch(() => ({ signups: [] })),
      fetch("/api/admin/dashboard/plan-distribution").then((r) => r.json()).catch(() => ({ plans: [] })),
      fetch("/api/admin/dashboard/user-growth?months=12").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/admin/usage").then((r) => r.json()).catch(() => ({})),
    ]).then(([statsData, signupsData, planData, growthData, usageData]) => {
      setStats(statsData ?? null);
      setSignups(signupsData?.signups ?? []);
      setPlanDist(planData?.plans ?? []);
      setGrowth(growthData?.data ?? []);
      setUsage(usageData ?? null);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#040404]">Dashboard</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Users"
              value={stats?.totalUsers ?? 0}
              color="bg-[#F0EBFF]"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5F30EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <StatCard
              label="Active Subscriptions"
              value={stats?.activeSubscriptions ?? 0}
              color="bg-green-50"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              }
            />
            <StatCard
              label="Total Businesses"
              value={stats?.totalBusinesses ?? 0}
              color="bg-blue-50"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              }
            />
            <StatCard
              label="Total Reviews"
              value={stats?.totalReviews ?? 0}
              color="bg-amber-50"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
                </svg>
              }
            />
          </div>

          {/* Usage Stats */}
          {usage && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E6E1FA] bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-[#9490A8]">Reviews Managed</p>
                <p className="mt-1 text-2xl font-bold text-[#040404]">{usage.totalReviewsManaged.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-[#E6E1FA] bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-[#9490A8]">AI Replies</p>
                <p className="mt-1 text-2xl font-bold text-[#5F30EB]">{usage.totalAiReplies.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-[#E6E1FA] bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-[#9490A8]">Manual Replies</p>
                <p className="mt-1 text-2xl font-bold text-[#040404]">{usage.totalManualReplies.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* User Growth Chart */}
          {growth.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[#E6E1FA] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[#040404]">User Growth (12 months)</h2>
              <div className="flex items-end gap-2 h-32">
                {growth.map((g) => {
                  const maxCount = Math.max(...growth.map((r) => r.count), 1);
                  const heightPct = (g.count / maxCount) * 100;
                  return (
                    <div key={g.month} className="flex flex-col items-center flex-1 gap-1.5">
                      <span className="text-xs text-[#9490A8]">{g.count}</span>
                      <div
                        className="w-full max-w-8 rounded-t-lg bg-[#5F30EB] transition-all hover:bg-[#4A1FD4]"
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                      <span className="text-xs text-[#9490A8]">{g.month.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Plan Distribution */}
          {planDist.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[#E6E1FA] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[#040404]">Plan Distribution</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {planDist.map((p) => (
                  <div key={p.plan} className="rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] p-3 text-center">
                    <p className="text-xs font-medium capitalize text-[#9490A8]">{p.plan}</p>
                    <p className="mt-1 text-xl font-bold text-[#5F30EB]">{p.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Signups */}
          {signups.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[#E6E1FA] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[#040404]">Recent Signups</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#F0EBFF]">
                      <th className="pb-3 text-start font-medium text-[#9490A8]">Name</th>
                      <th className="pb-3 text-start font-medium text-[#9490A8]">Email</th>
                      <th className="pb-3 text-start font-medium text-[#9490A8]">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signups.map((s) => (
                      <tr key={s.id} className="border-b border-[#F4F2FC] last:border-0">
                        <td className="py-3 font-medium text-[#040404]">{s.name}</td>
                        <td className="py-3 text-[#6B6487]">{s.email}</td>
                        <td className="py-3 text-[#9490A8]">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
