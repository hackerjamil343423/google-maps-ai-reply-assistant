import { describe, expect, it } from "vitest";

import {
  buildPlanCatalog,
  DEFAULT_PLAN_PRICES,
  normalizePlanPrices,
  PAID_PLAN_NAMES,
} from "@/lib/subscription/pricing";
import { PLAN_LIMITS } from "@/lib/subscription/plans";

describe("subscription pricing", () => {
  it("rejects invalid stored price maps", () => {
    expect(normalizePlanPrices(null)).toBeNull();
    expect(normalizePlanPrices(undefined)).toBeNull();
    expect(normalizePlanPrices("junk")).toBeNull();
  });

  it("normalizes a valid complete price map", () => {
    expect(normalizePlanPrices(DEFAULT_PLAN_PRICES)).toEqual(DEFAULT_PLAN_PRICES);
  });

  it("builds a catalog using override prices", () => {
    const catalog = buildPlanCatalog(DEFAULT_PLAN_PRICES);
    expect(Object.keys(catalog)).toEqual(Object.keys(PLAN_LIMITS));
    for (const plan of PAID_PLAN_NAMES) {
      expect(catalog[plan].monthlyPrice).toBe(DEFAULT_PLAN_PRICES[plan].monthlyPrice);
      expect(catalog[plan].yearlyPrice).toBe(DEFAULT_PLAN_PRICES[plan].yearlyPrice);
    }
  });
});
