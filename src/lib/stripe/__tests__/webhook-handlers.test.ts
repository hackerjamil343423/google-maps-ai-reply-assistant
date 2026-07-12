import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const mocks = vi.hoisted(() => ({
  findSubscription: vi.fn(),
  updateSet: vi.fn(),
  insertReturning: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  dbSchema: {
    subscriptions: {
      workspaceId: "workspace_id",
      stripeSubscriptionId: "stripe_subscription_id",
      stripeCustomerId: "stripe_customer_id",
    },
    stripeWebhookEvents: { id: "id" },
    platformSettings: { key: "key", value: "value" },
  },
  db: {
    query: {
      subscriptions: { findFirst: mocks.findSubscription },
    },
    update: vi.fn(() => ({
      set: (values: unknown) => {
        mocks.updateSet(values);
        return { where: vi.fn().mockResolvedValue(undefined) };
      },
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: mocks.insertReturning,
        })),
      })),
    })),
  },
}));

vi.mock("@/lib/emails", () => ({
  sendRenewalFailedEmail: vi.fn(),
}));

import {
  handleStripeEvent,
  handleSubscriptionUpsert,
  mapStripeStatus,
} from "@/lib/stripe/webhook-handlers";

function subscription(
  status: Stripe.Subscription["status"],
  overrides: Partial<Stripe.Subscription> = {}
) {
  return {
    id: "sub_123",
    status,
    customer: "cus_123",
    items: { data: [] },
    metadata: {},
    cancel_at_period_end: false,
    trial_end: null,
    ...overrides,
  } as Stripe.Subscription;
}

describe("Stripe webhook handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insertReturning.mockResolvedValue([{ id: "evt_1" }]);
  });

  it("maps Stripe statuses into local subscription states", () => {
    expect(mapStripeStatus("trialing")).toBe("trialing");
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("past_due")).toBe("past_due");
    expect(mapStripeStatus("unpaid")).toBe("past_due");
    expect(mapStripeStatus("canceled")).toBe("canceled");
    expect(mapStripeStatus("incomplete")).toBe("canceled");
    expect(mapStripeStatus("incomplete_expired")).toBe("canceled");
    expect(mapStripeStatus("paused")).toBe("canceled");
  });

  it("does not fabricate a future period end for incomplete subscriptions", async () => {
    mocks.findSubscription.mockResolvedValue({
      workspaceId: "workspace_1",
      plan: "Local Business",
      status: "trialing",
      stripeSubscriptionId: "sub_123",
      updatedAt: new Date("2026-07-02T00:00:00Z"),
    });

    await handleSubscriptionUpsert(subscription("incomplete"));

    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "canceled",
        currentPeriodEnd: null,
      })
    );
  });

  it("ignores duplicate webhook events before touching subscriptions", async () => {
    mocks.insertReturning.mockResolvedValue([]);
    const event = {
      id: "evt_1",
      type: "customer.subscription.updated",
      created: 1782950400,
      data: { object: subscription("active") },
    } as Stripe.Event;

    await handleStripeEvent(event);

    expect(mocks.findSubscription).not.toHaveBeenCalled();
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});
