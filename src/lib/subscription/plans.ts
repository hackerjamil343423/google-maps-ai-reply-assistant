export type PlanInfo = {
  label: string;
  price: string;
  maxAccounts: number;
};

export const PLAN_LIMITS: Record<string, PlanInfo> = {
  free: {
    label: "free",
    price: "$0",
    maxAccounts: 1,
  },
  "Local Business": {
    label: "Local Business",
    price: "$15",
    maxAccounts: 1,
  },
  "Multi-Location": {
    label: "Multi-Location",
    price: "$49",
    maxAccounts: 5,
  },
  "Agency Max": {
    label: "Agency Max",
    price: "$199",
    maxAccounts: 60,
  },
};

export type PlanName = "free" | "Local Business" | "Multi-Location" | "Agency Max";

export function isKnownPlan(value: string): value is PlanName {
  return value in PLAN_LIMITS;
}

/** Returns the StreamPay product UUID for a plan, read at call time from process.env. */
export function getPlanProductId(plan: string): string | null {
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
