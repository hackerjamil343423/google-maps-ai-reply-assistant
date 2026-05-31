"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SarIcon from "./SarIcon";

const DEFAULT_PRICING_PLANS = [
  {
    name: "Local Business",
    tagline:
      "Perfect for small businesses looking to automate their Google review responses.",
    monthlyPrice: 149,
    yearlyMonthlyEquivalent: 119,
    yearlyTotal: 1430,
    features: [
      "Single Google Business Profile",
      "Auto-Reply to Google Reviews",
      "Auto-Post or Manual Approval",
      "Customizable AI Prompt",
      "Tone Control",
      "Star-Based Review Filtering",
      "Google Business Profile Integration",
      "Bulk Reply Management",
      "AI Rewrite Assistant",
    ],
    highlighted: false,
  },
  {
    name: "Multi-Location",
    tagline:
      "Ideal for businesses with multiple locations needing comprehensive review management.",
    monthlyPrice: 349,
    yearlyMonthlyEquivalent: 279,
    yearlyTotal: 3350,
    features: [
      "Up to 5 Google Business Profiles",
      "Auto-Reply to Google Reviews",
      "Auto-Post or Manual Approval",
      "Customizable AI Prompt",
      "Tone Control",
      "Star-Based Review Filtering",
      "Google Business Profile Integration",
      "Bulk Reply Management",
      "AI Rewrite Assistant",
    ],
    highlighted: true,
  },
  {
    name: "Agency Max",
    tagline:
      "Ultimate solution for agencies managing multiple clients' review strategies.",
    monthlyPrice: 999,
    yearlyMonthlyEquivalent: 799,
    yearlyTotal: 9590,
    features: [
      "Up to 60 Google Business Profiles",
      "Auto-Reply to Google Reviews",
      "Auto-Post or Manual Approval",
      "Customizable AI Prompt",
      "Tone Control",
      "Star-Based Review Filtering",
      "Google Business Profile Integration",
      "Bulk Reply Management",
      "AI Rewrite Assistant",
    ],
    highlighted: false,
  },
];

interface PricingCardsProps {
  onPlanClick?: (planName: string, billingInterval: "monthly" | "yearly") => void;
  checkingOut?: string | null;
  isAuthenticated?: boolean;
}

export default function PricingCards({
  onPlanClick,
  checkingOut,
  isAuthenticated,
}: PricingCardsProps) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [pricingPlans, setPricingPlans] = useState(DEFAULT_PRICING_PLANS);

  useEffect(() => {
    let mounted = true;

    void fetch("/api/pricing/plans", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !Array.isArray(data?.plans)) return;

        setPricingPlans((current) =>
          current.map((plan) => {
            const updated = data.plans.find((item: { name?: string }) => item.name === plan.name);
            if (
              !updated ||
              !Number.isFinite(updated.monthlyPrice) ||
              !Number.isFinite(updated.yearlyPrice) ||
              !Number.isFinite(updated.yearlyMonthlyEquivalent)
            ) {
              return plan;
            }

            return {
              ...plan,
              monthlyPrice: updated.monthlyPrice,
              yearlyTotal: updated.yearlyPrice,
              yearlyMonthlyEquivalent: updated.yearlyMonthlyEquivalent,
            };
          })
        );
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="w-full">
      {/* Monthly / Yearly toggle */}
      <div className="flex justify-center mb-8 md:mb-10">
        <div className="inline-flex items-center rounded-full border border-[#5F30EB33] bg-white/80 p-1 gap-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all cursor-pointer ${
              interval === "monthly"
                ? "bg-[#5F30EB] text-white shadow-sm"
                : "text-[#5E5876] hover:text-[#5F30EB]"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("yearly")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${
              interval === "yearly"
                ? "bg-[#5F30EB] text-white shadow-sm"
                : "text-[#5E5876] hover:text-[#5F30EB]"
            }`}
          >
            Yearly
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                interval === "yearly"
                  ? "bg-white/20 text-white"
                  : "bg-green-100 text-green-700"
              }`}
            >
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {pricingPlans.map((plan) => {
          const isLoadingThis = checkingOut === plan.name;
          const displayPrice =
            interval === "yearly"
              ? plan.yearlyMonthlyEquivalent
              : plan.monthlyPrice;

          return (
            <div
              key={plan.name}
              className={`landing-card rounded-3xl p-6 md:p-8 flex flex-col relative ${
                plan.highlighted ? "ring-2 ring-[#5F30EB4D] md:-translate-y-3" : ""
              }`}
            >
              {interval === "yearly" && (
                <span className="absolute top-4 right-4 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700">
                  20% OFF
                </span>
              )}

              <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
              <p className="text-[#6A6A82] text-sm mb-5 leading-relaxed">
                {plan.tagline}
              </p>

              <div className="mb-6 pb-6 border-b border-[#5F30EB14]">
                <div className="flex items-baseline gap-1.5">
                  <SarIcon className="h-7 w-auto flex-shrink-0 text-[#040404]" />
                  <span className="text-4xl font-bold">{displayPrice}</span>
                  <span className="text-[#6A6A82] text-sm">/mo</span>
                </div>
                {interval === "yearly" && (
                  <p className="mt-1 text-xs text-[#6A6A82] flex items-center gap-1">
                    Billed as{" "}
                    <SarIcon className="h-2.5 w-auto text-[#6A6A82]" />
                    {plan.yearlyTotal.toLocaleString()}/year
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-3 text-sm text-[#4E4E5E]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#5F30EB"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {onPlanClick ? (
                <button
                  type="button"
                  onClick={() => onPlanClick(plan.name, interval)}
                  disabled={!!checkingOut}
                  className={`block w-full text-center py-3 rounded-full font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    plan.highlighted
                      ? "bg-[#5F30EB] text-[#F6F4FF] hover:bg-[#040404]"
                      : "bg-white text-black hover:bg-[#5F30EB] hover:text-[#F6F4FF]"
                  }`}
                >
                  {isLoadingThis ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      Redirecting...
                    </>
                  ) : isAuthenticated ? (
                    "Subscribe Now"
                  ) : (
                    "Get Started"
                  )}
                </button>
              ) : (
                <Link
                  href="/GetStarted?mode=signup"
                  className={`block text-center py-3 rounded-full font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-[#5F30EB] text-[#F6F4FF] hover:bg-[#040404]"
                      : "bg-white text-black hover:bg-[#5F30EB] hover:text-[#F6F4FF]"
                  }`}
                >
                  Get Started
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
