import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  completed: [] as string[],
  getRequestSession: vi.fn(),
  findProfile: vi.fn(),
  onConflictDoUpdate: vi.fn(),
}));

vi.mock("@/lib/api/session", () => ({ getRequestSession: mocks.getRequestSession }));
vi.mock("@/lib/db", () => ({
  db: {
    query: { userProfiles: { findFirst: mocks.findProfile } },
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: mocks.onConflictDoUpdate,
      }),
    }),
  },
}));

import { POST, tourCompleteSchema } from "@/app/api/tours/complete/route";
import { appendTourId } from "@/lib/tours";

function request(tourId: string) {
  return new NextRequest("http://localhost/api/tours/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tourId }),
  });
}

describe("tour completion", () => {
  beforeEach(() => {
    mocks.completed = [];
    mocks.getRequestSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findProfile.mockImplementation(async () => ({ toursCompleted: mocks.completed }));
    mocks.onConflictDoUpdate.mockImplementation(async ({ set }: { set: { toursCompleted: string[] } }) => {
      mocks.completed = set.toursCompleted;
    });
  });

  it("appends a tour once", () => expect(appendTourId([], "dashboard-welcome")).toEqual(["dashboard-welcome"]));
  it("is idempotent", () => expect(appendTourId(["dashboard-welcome"], "dashboard-welcome")).toEqual(["dashboard-welcome"]));
  it("rejects unknown tour ids", async () => {
    expect(tourCompleteSchema.safeParse({ tourId: "unknown" }).success).toBe(false);
    const response = await POST(request("unknown"));
    expect(response.status).toBe(400);
  });
  it("POST appends idempotently", async () => {
    const first = await POST(request("dashboard-welcome"));
    expect(first.status).toBe(200);
    expect((await first.json()).toursCompleted).toEqual(["dashboard-welcome"]);
    const second = await POST(request("dashboard-welcome"));
    expect(second.status).toBe(200);
    expect((await second.json()).toursCompleted).toEqual(["dashboard-welcome"]);
    expect(mocks.completed).toEqual(["dashboard-welcome"]);
  });
});
