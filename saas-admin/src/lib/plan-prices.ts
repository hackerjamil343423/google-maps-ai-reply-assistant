import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";

export const PLAN_PRICE_SETTING_KEY = "billing.plan_prices.v1";
export const PAID_PLAN_NAMES = [
  "Local Business",
  "Multi-Location",
  "Agency Max",
] as const;

export type PaidPlanName = (typeof PAID_PLAN_NAMES)[number];
export type PlanPrice = {
  monthlyPrice: number;
  yearlyPrice: number;
};
export type PlanPriceMap = Record<PaidPlanName, PlanPrice>;

export const DEFAULT_PLAN_PRICES: PlanPriceMap = {
  "Local Business": { monthlyPrice: 149, yearlyPrice: 1430 },
  "Multi-Location": { monthlyPrice: 349, yearlyPrice: 3350 },
  "Agency Max": { monthlyPrice: 999, yearlyPrice: 9590 },
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

export async function getEffectivePlanPrices(): Promise<PlanPriceMap> {
  return (await readStoredPlanPrices()) ?? DEFAULT_PLAN_PRICES;
}

export async function savePlanPrices(prices: PlanPriceMap) {
  if (!db) return;

  await db
    .insert(platformSettings)
    .values({
      key: PLAN_PRICE_SETTING_KEY,
      value: JSON.stringify(prices),
      description: "Editable paid plan prices in SAR.",
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        value: JSON.stringify(prices),
        description: "Editable paid plan prices in SAR.",
        updatedAt: new Date(),
      },
    });
}

export function toPlanPriceResponse(prices: PlanPriceMap) {
  return PAID_PLAN_NAMES.map((name) => ({
    name,
    monthlyPrice: prices[name].monthlyPrice,
    yearlyPrice: prices[name].yearlyPrice,
    yearlyMonthlyEquivalent: Math.floor(prices[name].yearlyPrice / 12),
  }));
}
