export type BillingInterval = "monthly" | "yearly";

export type PlanInfo = {
  label: string;
  monthlyPrice: string;
  yearlyPrice: string;
  /** Yearly price expressed as a monthly equivalent, shown in UI */
  yearlyMonthlyEquivalent: string;
  maxAccounts: number;
};

export const PLAN_LIMITS: Record<string, PlanInfo> = {
  free: {
    label: "free",
    monthlyPrice: "0",
    yearlyPrice: "0",
    yearlyMonthlyEquivalent: "0",
    maxAccounts: 1,
  },
  "Local Business": {
    label: "Local Business",
    monthlyPrice: "149",
    yearlyPrice: "1,430",
    yearlyMonthlyEquivalent: "119",
    maxAccounts: 1,
  },
  "Multi-Location": {
    label: "Multi-Location",
    monthlyPrice: "349",
    yearlyPrice: "3,350",
    yearlyMonthlyEquivalent: "279",
    maxAccounts: 5,
  },
  "Agency Max": {
    label: "Agency Max",
    monthlyPrice: "999",
    yearlyPrice: "9,590",
    yearlyMonthlyEquivalent: "799",
    maxAccounts: 60,
  },
};

export type PlanName = "free" | "Local Business" | "Multi-Location" | "Agency Max";

export type PlanGeideaConfig = {
  amount: number;
  currency: "SAR";
  cycleInterval: "month" | "year";
  cycleFrequency: number;
};

export function isKnownPlan(value: string): value is PlanName {
  return value in PLAN_LIMITS;
}

function parsePrice(value: string): number {
  return Number(value.replace(/,/g, ""));
}

export function getPlanGeideaConfig(
  plan: string,
  interval: BillingInterval = "monthly"
): PlanGeideaConfig | null {
  if (!isKnownPlan(plan) || plan === "free") return null;

  const planInfo = PLAN_LIMITS[plan];
  const amount =
    interval === "yearly"
      ? parsePrice(planInfo.yearlyPrice)
      : parsePrice(planInfo.monthlyPrice);

  return {
    amount,
    currency: "SAR",
    cycleInterval: interval === "yearly" ? "year" : "month",
    cycleFrequency: 1,
  };
}
