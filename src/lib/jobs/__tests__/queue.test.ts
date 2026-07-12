import { describe, expect, it, vi } from "vitest";

import { computeBackoff } from "@/lib/jobs/queue";

describe("computeBackoff", () => {
  it("uses exponential backoff capped at eight minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T00:00:00Z"));

    expect(computeBackoff(1).getTime() - Date.now()).toBe(30_000);
    expect(computeBackoff(2).getTime() - Date.now()).toBe(120_000);
    expect(computeBackoff(3).getTime() - Date.now()).toBe(480_000);
    expect(computeBackoff(10).getTime() - Date.now()).toBe(480_000);

    vi.useRealTimers();
  });
});
