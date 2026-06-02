export type BillingInterval = "monthly" | "yearly";

export type PlanInfo = {
  label: string;
  monthlyPrice: number;
  yearlyPrice: number;
  /** Yearly price expressed as a monthly equivalent, shown in UI */
  yearlyMonthlyEquivalent: number;
  maxAccounts: number;
};

export const PLAN_LIMITS: Record<string, PlanInfo> = {
  free: {
    label: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyMonthlyEquivalent: 0,
    maxAccounts: 1,
  },
  "Local Business": {
    label: "Local Business",
    monthlyPrice: 149,
    yearlyPrice: 1430,
    yearlyMonthlyEquivalent: 119,
    maxAccounts: 1,
  },
  "Multi-Location": {
    label: "Multi-Location",
    monthlyPrice: 349,
    yearlyPrice: 3350,
    yearlyMonthlyEquivalent: 279,
    maxAccounts: 5,
  },
  "Agency Max": {
    label: "Agency Max",
    monthlyPrice: 999,
    yearlyPrice: 9590,
    yearlyMonthlyEquivalent: 799,
    maxAccounts: 60,
  },
};

export type PlanName = "free" | "Local Business" | "Multi-Location" | "Agency Max";

export function isKnownPlan(value: string): value is PlanName {
  return value in PLAN_LIMITS;
}
