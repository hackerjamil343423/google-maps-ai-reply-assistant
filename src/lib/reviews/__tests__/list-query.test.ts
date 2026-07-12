import { describe, expect, it } from "vitest";

import {
  buildMonthKeys,
  buildOrderBy,
  buildStatusCondition,
  escapeSearchTerm,
} from "@/lib/reviews/list-query";

function sqlText(value: unknown) {
  const chunks = (value as { queryChunks?: Array<{ value?: string[] }> }).queryChunks ?? [];
  return chunks.flatMap((chunk) => chunk.value ?? []).join("");
}

describe("review list SQL helpers", () => {
  it("builds status conditions for each UI status", () => {
    expect(sqlText(buildStatusCondition("all"))).toContain("true");
    expect(sqlText(buildStatusCondition("pending"))).toContain("status <> 'posted'");
    expect(sqlText(buildStatusCondition("auto"))).toContain("source = 'ai'");
    expect(sqlText(buildStatusCondition("manual"))).toContain("source = 'manual'");
  });

  it("maps sort modes to stable order fragments", () => {
    expect(sqlText(buildOrderBy("relevant"))).toContain("reviewed_at DESC");
    expect(sqlText(buildOrderBy("newest"))).toContain("reviewed_at DESC");
    expect(sqlText(buildOrderBy("lowest"))).toContain("rating ASC");
    expect(sqlText(buildOrderBy("rating"))).toContain("rating DESC");
  });

  it("escapes SQL wildcard search characters", () => {
    expect(escapeSearchTerm("50%_ok\\done")).toBe("50\\%\\_ok\\\\done");
  });

  it("builds twelve month keys oldest to newest", () => {
    expect(buildMonthKeys(new Date("2026-07-02T00:00:00Z"))).toEqual([
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
  });
});
