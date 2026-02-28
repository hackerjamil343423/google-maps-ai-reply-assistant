export type PlanInfo = {
  label: string;
  price: string;
  maxAccounts: number;
  streamProductId: string | null;
};

export const PLAN_LIMITS: Record<string, PlanInfo> = {
  free: {
    label: "free",
    price: "$0",
    maxAccounts: 1,
    streamProductId: null,
  },
  "Local Business": {
    label: "Local Business",
    price: "$15",
    maxAccounts: 1,
    streamProductId: process.env.STREAM_PRODUCT_LOCAL_BUSINESS ?? null,
  },
  "Multi-Location": {
    label: "Multi-Location",
    price: "$49",
    maxAccounts: 5,
    streamProductId: process.env.STREAM_PRODUCT_MULTI_LOCATION ?? null,
  },
  "Agency Max": {
    label: "Agency Max",
    price: "$199",
    maxAccounts: 60,
    streamProductId: process.env.STREAM_PRODUCT_AGENCY_MAX ?? null,
  },
};

export type PlanName = "free" | "Local Business" | "Multi-Location" | "Agency Max";

export function isKnownPlan(value: string): value is PlanName {
  return value in PLAN_LIMITS;
}
