"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardShell from "@/components/DashboardShell";

const PLANS = [
  {
    name: "Local Business",
    price: "$15",
    accounts: "Up to 1 account",
    note: "Unlimited AI replies",
  },
  {
    name: "Multi-Location",
    price: "$49",
    accounts: "Up to 5 accounts",
    note: "Unlimited AI replies",
  },
  {
    name: "Agency Max",
    price: "$199",
    accounts: "Up to 60 accounts",
    note: "Unlimited AI replies",
  },
] as const;

type PlanName = (typeof PLANS)[number]["name"] | "free";

interface SubscriptionState {
  plan: PlanName;
  status: "trialing" | "active" | "past_due" | "canceled";
  price: string;
  trialEndsAt: string;
  nextBillingAt: string;
  connectedAccounts: number;
  maxAccounts: number;
  aiReplies: number;
  reviewsManaged: number;
}

const FALLBACK_STATE: SubscriptionState = {
  plan: "free",
  status: "trialing",
  price: "$0",
  trialEndsAt: "N/A",
  nextBillingAt: "N/A",
  connectedAccounts: 0,
  maxAccounts: 1,
  aiReplies: 0,
  reviewsManaged: 0,
};

export default function SubscriptionPage() {
  const [data, setData] = useState<SubscriptionState>(FALLBACK_STATE);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadSubscription() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/subscription", { cache: "no-store" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load subscription.");
      }
      setData({
        ...FALLBACK_STATE,
        ...payload,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscription.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSubscription();
  }, []);

  const activePlanLabel = useMemo(() => {
    if (data.plan === "free") return "free";
    return data.plan;
  }, [data.plan]);

  async function handleUpgrade(planName: (typeof PLANS)[number]["name"]) {
    setUpgrading(planName);
    setError("");
    try {
      const res = await fetch("/api/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planName }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update plan.");
      }
      setNotice(`Plan upgraded to ${planName}.`);
      setTimeout(() => setNotice(""), 3000);
      await loadSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update plan.");
    } finally {
      setUpgrading(null);
    }
  }

  const trialing = data.status === "trialing";

  return (
    <DashboardShell activeHref="/dashboard/subscription">
      <div className="h-full">
        <div
          className="p-4 md:p-6 min-h-[70vh] max-h-[calc(100vh-120px)] overflow-y-auto w-full md:max-w-5xl mx-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#2a2a2a transparent" }}
        >
          <h1 className="text-3xl font-bold text-white mb-8">Subscription Management</h1>

          {loading && (
            <div className="mb-6 text-sm text-gray-400">Loading subscription…</div>
          )}
          {notice && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 text-sm">
              {notice}
            </div>
          )}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div
            className="rounded-2xl border border-[#ffffff]/20 p-6 mb-8"
            style={{ background: "rgba(11,9,10,0.2)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-white">Current Plan</h2>
              <span className="px-3 py-1 rounded-full text-sm font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20">
                {trialing ? "Trialing" : "Active"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                      fill="none" stroke="#00FFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
                    </svg>
                  ),
                  label: "Plan",
                  value: activePlanLabel,
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                      fill="none" stroke="#00FFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />
                    </svg>
                  ),
                  label: "Price",
                  value: `${data.price}/month`,
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                      fill="none" stroke="#00FFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M8 2v4" /><path d="M16 2v4" />
                      <rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
                    </svg>
                  ),
                  label: "Next Billing",
                  value: data.nextBillingAt,
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                      fill="none" stroke="#00FFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <path d="M16 3.128a4 4 0 0 1 0 7.744" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  ),
                  label: "Trial Ends",
                  value: data.trialEndsAt,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">{item.icon}</div>
                  <div className="min-w-0">
                    <p className="text-gray-400 text-sm">{item.label}</p>
                    <p className="text-white font-medium truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {trialing && (
            <div
              className="rounded-2xl p-6 mb-8 border border-blue-500/20"
              style={{ background: "linear-gradient(to right, rgba(59,130,246,0.08), rgba(168,85,247,0.08))" }}
            >
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
                    fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-2">Complete Your Free Trial</h3>
                  <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                    You&apos;re currently on a free trial. Take advantage of all features and see how our AI can help grow your business reviews.
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {["Unlimited AI replies", "Advanced analytics", "Priority support"].map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                        <span className="text-gray-300">{f}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-blue-400 font-medium text-sm">Trial ends: {data.trialEndsAt}</p>
                </div>
                <Link
                  href="/pricing"
                  className="flex-shrink-0 bg-[#00FFE9] text-black px-6 py-3 rounded-xl font-semibold hover:bg-[#00FFE9]/80 transition-colors text-sm"
                >
                  Compare Plans
                </Link>
              </div>
            </div>
          )}

          <div
            className="rounded-2xl border border-[#ffffff]/20 p-6 mb-8"
            style={{ background: "rgba(11,9,10,0.2)" }}
          >
            <h2 className="text-xl font-semibold text-white mb-5">Usage Statistics</h2>

            <div className="mb-5">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Connected Accounts</span>
                <span>{data.connectedAccounts} / {data.maxAccounts}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      100,
                      (data.connectedAccounts / Math.max(data.maxAccounts, 1)) * 100
                    )}%`,
                    background: "linear-gradient(to right, #00FFE9, #00B4D8)",
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Connected", value: data.connectedAccounts, color: "text-green-400" },
                { label: "Remaining", value: Math.max(0, data.maxAccounts - data.connectedAccounts), color: "text-white" },
                { label: "AI Replies", value: data.aiReplies, color: "text-[#00FFE9]" },
                { label: "Reviews Managed", value: data.reviewsManaged, color: "text-[#00FFE9]" },
              ].map((s) => (
                <div key={s.label} className="text-center rounded-xl border border-[#ffffff10] p-4"
                  style={{ background: "rgba(11,9,10,0.3)" }}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-gray-400 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl border border-[#ffffff]/20 p-6"
            style={{ background: "rgba(11,9,10,0.2)" }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Upgrade Your Plan</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {PLANS.map((plan) => {
                const isCurrent = data.plan === plan.name;
                const isUpgrading = upgrading === plan.name;
                return (
                  <div
                    key={plan.name}
                    className="relative p-6 rounded-xl border flex flex-col min-h-[200px] transition-all duration-300 hover:border-[#00FFE9]/50"
                    style={{
                      background: isCurrent
                        ? "rgba(0,255,233,0.05)"
                        : "rgba(11,9,10,0.2)",
                      border: isCurrent
                        ? "1px solid rgba(0,255,233,0.4)"
                        : "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    {isCurrent && (
                      <div className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full bg-[#00FFE9]/15 text-[#00FFE9] border border-[#00FFE9]/30">
                        Current
                      </div>
                    )}
                    <div className="text-center mb-5 flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
                      <div className="text-3xl font-bold text-[#00FFE9] mb-1">
                        {plan.price}
                        <span className="text-sm text-gray-400">/month</span>
                      </div>
                      <p className="text-gray-400 text-sm mt-2">{plan.accounts}</p>
                      <p className="text-gray-500 text-xs mt-1">{plan.note}</p>
                    </div>
                    <button
                      onClick={() => !isCurrent && handleUpgrade(plan.name)}
                      disabled={isCurrent || isUpgrading}
                      className="w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                      style={{
                        background: isCurrent ? "rgba(0,255,233,0.15)" : "#00FFE9",
                        color: isCurrent ? "#00FFE9" : "#000",
                        opacity: isUpgrading ? 0.7 : 1,
                      }}
                    >
                      {isUpgrading ? (
                        <>
                          <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                          Processing…
                        </>
                      ) : isCurrent ? (
                        "✓ Active Plan"
                      ) : (
                        "Upgrade"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
