export const PLAN_LIMITS = {
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
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export function isKnownPlan(value: string): value is PlanName {
  return value in PLAN_LIMITS;
}
