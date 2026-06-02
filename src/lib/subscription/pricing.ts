import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import {
  isKnownPlan,
  PLAN_LIMITS,
  type BillingInterval,
  type PlanInfo,
  type PlanName,
} from "@/lib/subscription/plans";

export const PLAN_PRICE_SETTING_KEY = "billing.plan_prices.v1";
export const STRIPE_PRICE_IDS_SETTING_KEY = "billing.stripe_price_ids.v1";

export const PAID_PLAN_NAMES = [
  "Local Business",
  "Multi-Location",
  "Agency Max",
] as const;

export type PaidPlanName = (typeof PAID_PLAN_NAMES)[number];
export type PlanPrice = Pick<PlanInfo, "monthlyPrice" | "yearlyPrice">;
export type PlanPriceMap = Record<PaidPlanName, PlanPrice>;

export type StripePriceIds = Record<
  PaidPlanName,
  { monthly: string; yearly: string }
>;

export const DEFAULT_PLAN_PRICES: PlanPriceMap = {
  "Local Business": {
    monthlyPrice: PLAN_LIMITS["Local Business"].monthlyPrice,
    yearlyPrice: PLAN_LIMITS["Local Business"].yearlyPrice,
  },
  "Multi-Location": {
    monthlyPrice: PLAN_LIMITS["Multi-Location"].monthlyPrice,
    yearlyPrice: PLAN_LIMITS["Multi-Location"].yearlyPrice,
  },
  "Agency Max": {
    monthlyPrice: PLAN_LIMITS["Agency Max"].monthlyPrice,
    yearlyPrice: PLAN_LIMITS["Agency Max"].yearlyPrice,
  },
};

function isPositiveWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function normalizePlanPrices(input: unknown): PlanPriceMap | null {
  if (!input || typeof input !== "object") return null;

  const next = {} as PlanPriceMap;
  for (const planName of PAID_PLAN_NAMES) {
    const value = (input as Record<string, unknown>)[planName];
    if (!value || typeof value !== "object") return null;

    const monthlyPrice = (value as Record<string, unknown>).monthlyPrice;
    const yearlyPrice = (value as Record<string, unknown>).yearlyPrice;
    if (!isPositiveWholeNumber(monthlyPrice) || !isPositiveWholeNumber(yearlyPrice)) {
      return null;
    }

    next[planName] = { monthlyPrice, yearlyPrice };
  }

  return next;
}

export function buildPlanCatalog(prices: PlanPriceMap): Record<PlanName, PlanInfo> {
  return {
    free: PLAN_LIMITS.free,
    "Local Business": {
      ...PLAN_LIMITS["Local Business"],
      ...prices["Local Business"],
      yearlyMonthlyEquivalent: Math.floor(prices["Local Business"].yearlyPrice / 12),
    },
    "Multi-Location": {
      ...PLAN_LIMITS["Multi-Location"],
      ...prices["Multi-Location"],
      yearlyMonthlyEquivalent: Math.floor(prices["Multi-Location"].yearlyPrice / 12),
    },
    "Agency Max": {
      ...PLAN_LIMITS["Agency Max"],
      ...prices["Agency Max"],
      yearlyMonthlyEquivalent: Math.floor(prices["Agency Max"].yearlyPrice / 12),
    },
  };
}

async function readStoredPlanPrices(): Promise<PlanPriceMap | null> {
  if (!db) return null;

  const [setting] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, PLAN_PRICE_SETTING_KEY))
    .limit(1)
    .catch(() => []);

  if (!setting?.value) return null;

  try {
    return normalizePlanPrices(JSON.parse(setting.value));
  } catch {
    return null;
  }
}

export async function getEffectivePlanCatalog(): Promise<Record<PlanName, PlanInfo>> {
  const stored = await readStoredPlanPrices();
  return buildPlanCatalog(stored ?? DEFAULT_PLAN_PRICES);
}

export async function getEffectivePlanInfo(plan: PlanName): Promise<PlanInfo> {
  const catalog = await getEffectivePlanCatalog();
  return catalog[plan];
}

export async function getDisplayPlanPrices() {
  const catalog = await getEffectivePlanCatalog();
  return PAID_PLAN_NAMES.map((name) => ({
    name,
    monthlyPrice: catalog[name].monthlyPrice,
    yearlyPrice: catalog[name].yearlyPrice,
    yearlyMonthlyEquivalent: catalog[name].yearlyMonthlyEquivalent,
  }));
}

/** Read the plan→Stripe Price ID mapping stored in platformSettings. */
async function readStripePriceIds(): Promise<StripePriceIds | null> {
  if (!db) return null;

  const [setting] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, STRIPE_PRICE_IDS_SETTING_KEY))
    .limit(1)
    .catch(() => []);

  if (!setting?.value) return null;

  try {
    const parsed = JSON.parse(setting.value) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const result = {} as StripePriceIds;
    for (const plan of PAID_PLAN_NAMES) {
      const entry = (parsed as Record<string, unknown>)[plan];
      if (
        !entry ||
        typeof entry !== "object" ||
        typeof (entry as Record<string, unknown>).monthly !== "string" ||
        typeof (entry as Record<string, unknown>).yearly !== "string"
      ) {
        return null;
      }
      result[plan] = {
        monthly: (entry as Record<string, string>).monthly,
        yearly: (entry as Record<string, string>).yearly,
      };
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Returns the Stripe Price ID for a given plan + interval, or null if not
 * configured. The mapping is bootstrapped once via scripts/stripe-bootstrap.ts
 * and stored in platformSettings under STRIPE_PRICE_IDS_SETTING_KEY.
 */
export async function getStripePriceId(
  plan: string,
  interval: BillingInterval
): Promise<string | null> {
  if (!isKnownPlan(plan) || plan === "free") return null;

  const ids = await readStripePriceIds();
  if (!ids) return null;

  return interval === "yearly" ? ids[plan].yearly : ids[plan].monthly;
}
