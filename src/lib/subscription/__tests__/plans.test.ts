import { describe, expect, it } from "vitest";

import { isKnownPlan, PLAN_LIMITS } from "@/lib/subscription/plans";

describe("subscription plans", () => {
  it("recognizes only canonical plan names", () => {
    expect(isKnownPlan("free")).toBe(true);
    expect(isKnownPlan("Local Business")).toBe(true);
    expect(isKnownPlan("Multi-Location")).toBe(true);
    expect(isKnownPlan("Agency Max")).toBe(true);
    expect(isKnownPlan("")).toBe(false);
    expect(isKnownPlan("Free")).toBe(false);
    expect(isKnownPlan("local business")).toBe(false);
  });

  it("keeps plan limit price invariants", () => {
    for (const [name, plan] of Object.entries(PLAN_LIMITS)) {
      expect(plan.maxAccounts).toBeGreaterThanOrEqual(1);
      if (name === "free") {
        expect(plan.monthlyPrice).toBe(0);
      } else {
        expect(plan.monthlyPrice).toBeGreaterThan(0);
        expect(plan.yearlyPrice).toBeGreaterThan(0);
      }
    }
  });
});
