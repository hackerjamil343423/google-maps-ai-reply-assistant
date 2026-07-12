import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirstMember: vi.fn(),
  findManyAssignments: vi.fn(),
  findManyBusinesses: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      workspaceMembers: { findFirst: mocks.findFirstMember },
      workspaceMemberBusinessAssignments: { findMany: mocks.findManyAssignments },
      businesses: { findMany: mocks.findManyBusinesses },
    },
  },
}));

import {
  getAccessibleBusinessIds,
  userCanAccessBusinesses,
  validateBusinessIdsForWorkspace,
} from "@/lib/business-access";

describe("business access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns no accessible businesses without membership", async () => {
    mocks.findFirstMember.mockResolvedValue(null);
    expect(await getAccessibleBusinessIds("workspace", "user")).toEqual([]);
  });

  it("returns all workspace businesses for all-access members", async () => {
    mocks.findFirstMember.mockResolvedValue({ role: "owner", accessAllBusinesses: true });
    mocks.findManyBusinesses.mockResolvedValue([{ id: "b1" }, { id: "b2" }]);
    expect(await getAccessibleBusinessIds("workspace", "user")).toEqual(["b1", "b2"]);
  });

  it("returns selected assignments intersected with workspace businesses", async () => {
    mocks.findFirstMember.mockResolvedValue({ role: "viewer", accessAllBusinesses: false });
    mocks.findManyAssignments.mockResolvedValue([{ businessId: "b1" }, { businessId: "foreign" }]);
    mocks.findManyBusinesses.mockResolvedValue([{ id: "b1" }, { id: "b2" }]);
    expect(await getAccessibleBusinessIds("workspace", "user")).toEqual(["b1"]);
  });

  it("denies empty business access checks", async () => {
    expect(await userCanAccessBusinesses("workspace", "user", [])).toBe(false);
  });

  it("validates and dedupes workspace business ids", async () => {
    mocks.findManyBusinesses.mockResolvedValue([{ id: "b1" }, { id: "b2" }]);
    await expect(validateBusinessIdsForWorkspace("workspace", ["b1", "b1", "b2"])).resolves.toEqual([
      "b1",
      "b2",
    ]);
  });

  it("rejects foreign business ids", async () => {
    mocks.findManyBusinesses.mockResolvedValue([{ id: "b1" }]);
    await expect(validateBusinessIdsForWorkspace("workspace", ["b1", "foreign"])).rejects.toThrow(
      "One or more selected profiles do not belong to this workspace."
    );
  });
});
