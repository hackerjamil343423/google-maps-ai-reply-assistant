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

export function isKnownPlan(value: string): value is PlanName {
  return value in PLAN_LIMITS;
}

/**
 * Returns the StreamPay product UUID for a plan + billing interval.
 * Reads from process.env at call time — never at module load time.
 */
export function getPlanProductId(
  plan: string,
  interval: BillingInterval = "monthly"
): string | null {
  if (interval === "yearly") {
    switch (plan) {
      case "Local Business":
        return process.env.STREAM_PRODUCT_LOCAL_BUSINESS_YEARLY ?? null;
      case "Multi-Location":
        return process.env.STREAM_PRODUCT_MULTI_LOCATION_YEARLY ?? null;
      case "Agency Max":
        return process.env.STREAM_PRODUCT_AGENCY_MAX_YEARLY ?? null;
      default:
        return null;
    }
  }

  switch (plan) {
    case "Local Business":
      return process.env.STREAM_PRODUCT_LOCAL_BUSINESS ?? null;
    case "Multi-Location":
      return process.env.STREAM_PRODUCT_MULTI_LOCATION ?? null;
    case "Agency Max":
      return process.env.STREAM_PRODUCT_AGENCY_MAX ?? null;
    default:
      return null;
  }
}
