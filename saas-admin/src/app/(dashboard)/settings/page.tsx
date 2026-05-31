"use client";

import { useEffect, useState } from "react";

type PlatformSetting = {
  key: string;
  value: string;
  description: string | null;
};

const PAID_PLAN_NAMES = [
  "Local Business",
  "Multi-Location",
  "Agency Max",
] as const;

type PaidPlanName = (typeof PAID_PLAN_NAMES)[number];
type PlanPriceForm = Record<PaidPlanName, { monthlyPrice: string; yearlyPrice: string }>;

const DEFAULT_PLAN_PRICE_FORM: PlanPriceForm = {
  "Local Business": { monthlyPrice: "149", yearlyPrice: "1430" },
  "Multi-Location": { monthlyPrice: "349", yearlyPrice: "3350" },
  "Agency Max": { monthlyPrice: "999", yearlyPrice: "9590" },
};

const SETTING_GROUPS = [
  {
    label: "AI Defaults",
    key: "ai_defaults",
    settings: [
      { key: "default_tone", label: "Default Tone", description: "Default AI reply tone", type: "text" },
      { key: "ai_model", label: "AI Model", description: "OpenAI model to use", type: "text" },
    ],
  },
  {
    label: "Platform Limits",
    key: "platform_limits",
    settings: [
      { key: "max_users_per_workspace", label: "Max Users per Workspace", description: "Limit users per workspace", type: "number" },
    ],
  },
  {
    label: "Platform Behavior",
    key: "platform_behavior",
    settings: [
      { key: "require_onboarding", label: "Require Onboarding", description: "Force users to complete onboarding", type: "boolean" },
      { key: "maintenance_mode", label: "Maintenance Mode", description: "Put the platform in maintenance mode", type: "boolean" },
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [planPrices, setPlanPrices] = useState<PlanPriceForm>(DEFAULT_PLAN_PRICE_FORM);
  const [savingPlanPrices, setSavingPlanPrices] = useState(false);
  const [planPriceSaved, setPlanPriceSaved] = useState(false);
  const [planPriceError, setPlanPriceError] = useState("");

  const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

  function getValue(key: string): string {
    return settingsMap.get(key) ?? "";
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/platform-settings").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/plan-prices").then((r) => r.json()).catch(() => null),
    ])
      .then(([settingsData, planData]) => {
        setSettings(settingsData?.settings ?? []);
        if (Array.isArray(planData?.plans)) {
          setPlanPrices((prev) => {
            const next = { ...prev };
            for (const plan of planData.plans) {
              if (PAID_PLAN_NAMES.includes(plan.name)) {
                next[plan.name as PaidPlanName] = {
                  monthlyPrice: String(plan.monthlyPrice ?? ""),
                  yearlyPrice: String(plan.yearlyPrice ?? ""),
                };
              }
            }
            return next;
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveSetting(key: string, value: string) {
    setSaving(key);
    setSaved(null);
    await fetch("/api/admin/platform-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);

    setSettings((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) {
        return prev.map((s) => (s.key === key ? { ...s, value } : s));
      }
      return [...prev, { key, value, description: null }];
    });
  }

  function updatePlanPrice(planName: PaidPlanName, field: "monthlyPrice" | "yearlyPrice", value: string) {
    setPlanPrices((prev) => ({
      ...prev,
      [planName]: {
        ...prev[planName],
        [field]: value,
      },
    }));
    setPlanPriceSaved(false);
    setPlanPriceError("");
  }

  function parsePositiveInteger(value: string) {
    if (!/^\d+$/.test(value)) return null;
    const numeric = Number(value);
    return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
  }

  async function savePlanPrices() {
    const prices = {} as Record<PaidPlanName, { monthlyPrice: number; yearlyPrice: number }>;
    for (const planName of PAID_PLAN_NAMES) {
      const monthlyPrice = parsePositiveInteger(planPrices[planName].monthlyPrice);
      const yearlyPrice = parsePositiveInteger(planPrices[planName].yearlyPrice);
      if (!monthlyPrice || !yearlyPrice) {
        setPlanPriceError("Enter positive whole-number SAR prices for every plan.");
        return;
      }
      prices[planName] = { monthlyPrice, yearlyPrice };
    }

    setSavingPlanPrices(true);
    setPlanPriceError("");
    setPlanPriceSaved(false);

    const res = await fetch("/api/admin/plan-prices", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prices }),
    });
    const data = await res.json().catch(() => null);
    setSavingPlanPrices(false);

    if (!res.ok) {
      setPlanPriceError(data?.error || "Failed to save plan prices.");
      return;
    }

    setPlanPriceSaved(true);
    setTimeout(() => setPlanPriceSaved(false), 2500);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#040404]">Settings</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          {SETTING_GROUPS.map((group) => (
            <div key={group.key} className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[#040404]">{group.label}</h2>
              <div className="space-y-4">
                {group.settings.map((setting) => {
                  const isBoolean = setting.type === "boolean";
                  const currentValue = getValue(setting.key);
                  const isChecked = currentValue === "true";

                  return (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#040404]">{setting.label}</p>
                        <p className="text-xs text-[#9490A8]">{setting.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {isBoolean ? (
                          <button
                            onClick={() => saveSetting(setting.key, String(!isChecked))}
                            className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                              isChecked ? "bg-[#5F30EB]" : "bg-[#E6E1FA]"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                isChecked ? "translate-x-5" : ""
                              }`}
                            />
                          </button>
                        ) : (
                          <input
                            type={setting.type === "number" ? "number" : "text"}
                            defaultValue={currentValue}
                            onBlur={(e) => {
                              if (e.target.value !== currentValue) {
                                saveSetting(setting.key, e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-3 py-2 text-sm text-[#040404] outline-none focus:border-[#5F30EB] w-40"
                          />
                        )}
                        {saving === setting.key && (
                          <div className="h-4 w-4 animate-spin rounded-full border border-[#5F30EB] border-t-transparent" />
                        )}
                        {saved === setting.key && (
                          <span className="text-xs text-green-600 font-medium">Saved</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#040404]">Plan Pricing</h2>
                <p className="mt-1 text-xs text-[#9490A8]">
                  Updates affect new checkouts only. Existing Geidea subscriptions keep their current billing amount.
                </p>
              </div>
              <button
                type="button"
                onClick={savePlanPrices}
                disabled={savingPlanPrices}
                className="rounded-xl bg-[#5F30EB] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPlanPrices ? "Saving..." : "Save Prices"}
              </button>
            </div>

            <div className="space-y-4">
              {PAID_PLAN_NAMES.map((planName) => {
                const yearlyPrice = parsePositiveInteger(planPrices[planName].yearlyPrice);
                const yearlyMonthly = yearlyPrice ? Math.floor(yearlyPrice / 12).toLocaleString("en-US") : "-";

                return (
                  <div key={planName} className="grid gap-3 rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] p-4 md:grid-cols-[1fr_140px_140px_160px] md:items-center">
                    <div>
                      <p className="text-sm font-semibold text-[#040404]">{planName}</p>
                      <p className="text-xs text-[#9490A8]">SAR major units</p>
                    </div>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-[#6B6487]">Monthly</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={planPrices[planName].monthlyPrice}
                        onChange={(e) => updatePlanPrice(planName, "monthlyPrice", e.target.value)}
                        className="w-full rounded-xl border border-[#E6E1FA] bg-white px-3 py-2 text-sm text-[#040404] outline-none focus:border-[#5F30EB]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-[#6B6487]">Yearly</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={planPrices[planName].yearlyPrice}
                        onChange={(e) => updatePlanPrice(planName, "yearlyPrice", e.target.value)}
                        className="w-full rounded-xl border border-[#E6E1FA] bg-white px-3 py-2 text-sm text-[#040404] outline-none focus:border-[#5F30EB]"
                      />
                    </label>
                    <div>
                      <p className="text-xs font-medium text-[#6B6487]">Yearly shown as</p>
                      <p className="mt-1 text-sm font-semibold text-[#040404]">SAR {yearlyMonthly}/mo</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 min-h-5">
              {planPriceError && <p className="text-sm font-medium text-red-600">{planPriceError}</p>}
              {planPriceSaved && <p className="text-sm font-medium text-green-600">Plan prices saved.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">Admin Users</h2>
            <p className="text-sm text-[#9490A8]">
              Grant or revoke admin access from the{" "}
              <a href="/users" className="text-[#5F30EB] hover:underline">
                Users
              </a>{" "}
              page by toggling the &ldquo;Admin&rdquo; flag on individual user profiles.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
