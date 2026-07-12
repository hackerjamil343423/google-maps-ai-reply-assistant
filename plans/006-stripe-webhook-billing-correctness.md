# Plan 006: Stripe webhook correctness — no access without payment, no resurrection from stale events

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ca8b8b1f..HEAD -- src/app/api/subscription/webhook/route.ts src/lib/subscription/server.ts src/lib/db/schema.ts src/lib/stripe`
> On any in-scope drift, compare the "Current state" excerpts against live code;
> on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (touches billing state transitions; mitigated by extracting handlers into a testable module first)
- **Depends on**: plans/005-vitest-baseline.md (required — these changes must land with tests)
- **Category**: bug / security
- **Planned at**: commit `ca8b8b1f`, 2026-07-02

## Why this matters

Two revenue-integrity holes in the Stripe webhook:

1. **Never-paid access**: `mapStripeStatus` maps `incomplete` / `incomplete_expired` / `paused` to `"canceled"` (the `default:` branch). When the subscription item carries no `current_period_end`, the handler **fabricates** one (`now + 30/365 days`). `getWorkspaceAccess` grants access to `status === "canceled"` whenever `currentPeriodEnd > now` (that branch exists for legitimate cancel-at-period-end UX). Chain: a checkout whose payment never completes → row stored `canceled` with a fabricated month-long period end → full AI/posting access without paying.
2. **No event idempotency/ordering**: Stripe delivers at-least-once with no ordering guarantee. `customer.subscription.deleted` sets `status: "canceled"`, `stripeSubscriptionId: null` but keeps `stripeCustomerId`; a late or replayed `customer.subscription.updated` then re-matches the row **by customer id** and rewrites `status`/`currentPeriodEnd` from the stale event — resurrecting a canceled subscription.

Also fixed en route: the handlers live inside the route file, which Next.js restricts to route exports, so nothing is unit-testable today.

## Current state

Relevant files:

- `src/app/api/subscription/webhook/route.ts` — everything: `PLAN_BY_PRICE` cache + `getPlanForPriceId` (15–49), `mapStripeStatus` (51–65), `handleSubscriptionUpsert` (67–140), `sendFailureEmail` (142–181), `POST` with signature verification (183–313)
- `src/lib/subscription/server.ts` — `getWorkspaceAccess` (20–…); the canceled-grace branch is lines 42–51
- `src/lib/db/schema.ts` — `subscriptions` table (362–381; `status` is `subscriptionStatusEnum`, `currentPeriodEnd` nullable, `cancelAtPeriodEnd boolean not null default false`); `platformSettings` (383–392)

Key excerpts as of `ca8b8b1f`:

```ts
// webhook/route.ts:51-65
function mapStripeStatus(
  status: Stripe.Subscription["status"]
): "trialing" | "active" | "past_due" | "canceled" {
  switch (status) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due":
    case "unpaid": return "past_due";
    default: return "canceled";
  }
}
```

```ts
// webhook/route.ts:91-95
  // In the 2026 Stripe API, current_period_end moved to SubscriptionItem.
  const periodEndTs = priceItem?.current_period_end;
  const currentPeriodEnd = periodEndTs
    ? new Date(periodEndTs * 1000)
    : new Date(Date.now() + (billingInterval === "yearly" ? 365 : 30) * 86400 * 1000);
```

```ts
// webhook/route.ts:107-118 (fallback matching inside handleSubscriptionUpsert)
  if (!sub && stripeCustomerId) {
    sub = await db.query.subscriptions.findFirst({
      where: eq(dbSchema.subscriptions.stripeCustomerId, stripeCustomerId),
    });
  }
  if (!sub && workspaceIdHint) { ... }
```

```ts
// src/lib/subscription/server.ts:42-51
  if (status === "canceled") {
    // Allow access if still within the paid period (cancel-at-period-end UX).
    const withinPaidPeriod =
      sub.currentPeriodEnd != null && sub.currentPeriodEnd > new Date();
    if (withinPaidPeriod) {
      return { allowed: true, plan, planInfo, status };
    }
    return { allowed: false, reason: "canceled", plan, planInfo, status };
  }
```

Design constraints decided at planning time:
- **Do not add new values to `subscriptionStatusEnum`** — UI and access logic branch on the four existing values; keep the fix inside period-end handling and event guards.
- The webhook deliberately returns 200 on handler errors (comment at 307–310) — keep that behavior.
- Stripe API note in the code is real: this codebase reads `current_period_end` from the subscription *item* and invoice subscription refs from `invoice.parent.subscription_details.subscription`. Preserve both.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Tests     | `npm test`             | all pass            |
| Lint      | `npm run lint`         | exit 0              |
| Build     | `npm run typecheck`    | exit 0              |
| Migration | `npm run db:generate` then `npm run db:push` | exit 0 |

## Scope

**In scope**:
- `src/lib/stripe/webhook-handlers.ts` (create — extracted logic)
- `src/app/api/subscription/webhook/route.ts` (becomes a thin shell: signature verify + dispatch)
- `src/lib/db/schema.ts` (add `stripeWebhookEvents` table) + generated migration
- `src/lib/stripe/__tests__/webhook-handlers.test.ts` (create)

**Out of scope**:
- `src/lib/subscription/server.ts` — the canceled-grace branch is correct for real cancel-at-period-end; the fix is upstream (stop writing bogus `currentPeriodEnd`). Do not change access logic.
- Checkout/portal/cancel/downgrade routes.
- `sendFailureEmail` internals (move it verbatim if extraction requires).

## Git workflow

- Branch: `advisor/006-webhook-correctness` off `dev`
- Commit per step; short imperative sentences.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Extract handlers into a lib module

Create `src/lib/stripe/webhook-handlers.ts`. Move from the route file, unchanged: `PLAN_BY_PRICE` + `getPlanForPriceId`, `mapStripeStatus`, `handleSubscriptionUpsert`, `sendFailureEmail`, plus a new exported `handleStripeEvent(event: Stripe.Event): Promise<void>` containing the existing `switch` body. The route file keeps only: raw-body read, signature verification (lines 183–206 today), then `await handleStripeEvent(event)` inside the existing try/catch-return-200. Export `mapStripeStatus` and `handleSubscriptionUpsert` for tests.

**Verify**: `npm run typecheck` → exit 0; `npm test` → still green; route file no longer defines `mapStripeStatus` (`grep -n "mapStripeStatus" src/app/api/subscription/webhook/route.ts` → no match).

### Step 2: Characterization tests BEFORE behavior changes

In `src/lib/stripe/__tests__/webhook-handlers.test.ts`, with `vi.mock("@/lib/db", ...)` (model on the business-access suite from plan 005) and `vi.mock("@/lib/emails", ...)`:

- `mapStripeStatus`: `trialing→trialing`, `active→active`, `past_due→past_due`, `unpaid→past_due`, `canceled→canceled`, `incomplete→canceled`, `incomplete_expired→canceled`, `paused→canceled` (current behavior, pinned).
- `handleSubscriptionUpsert` happy path: active sub with a real `items.data[0].current_period_end` → db update called with `status: "active"` and that exact date.

**Verify**: `npm test` → all pass.

### Step 3: Stop fabricating period ends for non-entitled statuses

In `handleSubscriptionUpsert`, replace the fallback at (moved) lines 91–95: fabricate a period end **only when** `subscription.status` is `active`, `trialing`, `past_due`, or `unpaid`. For every other status (`incomplete`, `incomplete_expired`, `paused`, `canceled` with no item period end), write `currentPeriodEnd: null`. Target shape:

```ts
  const ENTITLED: Stripe.Subscription["status"][] = ["active", "trialing", "past_due", "unpaid"];
  const currentPeriodEnd = periodEndTs
    ? new Date(periodEndTs * 1000)
    : ENTITLED.includes(subscription.status)
      ? new Date(Date.now() + (billingInterval === "yearly" ? 365 : 30) * 86400 * 1000)
      : null;
```

`currentPeriodEnd` is nullable in the schema and `getWorkspaceAccess` already handles null (denies the canceled-grace branch). Add tests: `incomplete` sub with no item period end → update called with `status: "canceled"`, `currentPeriodEnd: null`; and (regression for the hole) `incomplete` must never produce a future-dated `currentPeriodEnd`.

**Verify**: `npm test` → all pass including the two new cases.

### Step 4: Event idempotency + terminal-state guard

1. Schema: add to `src/lib/db/schema.ts`:

```ts
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: text("id").primaryKey(), // Stripe event id (evt_...)
  type: text("type").notNull(),
  eventCreatedAt: timestamp("event_created_at", { withTimezone: true }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});
```

`npm run db:generate` + `npm run db:push`.

2. In `handleStripeEvent`, before the switch: `insert into stripeWebhookEvents ... onConflictDoNothing({ target: id })` with `.returning({ id })`; if the returning array is empty, the event was already processed → log and return (idempotent replay guard).

3. Terminal-state guard in `handleSubscriptionUpsert`: after the row is found, skip the update (log + return) when **all** of: the local row's `status === "canceled"`, its `stripeSubscriptionId` is `null` (i.e. it was terminally canceled by a `deleted` event, not merely scheduled to cancel), and the incoming `subscription.id` matches nothing stored (the row was found via the customer-id or workspace-hint fallback). A *genuinely new* subscription for a returning customer arrives with `status` in the entitled set **and** a `checkout.session.completed`/`created` flow — allow the update when `subscription.status` is `active` or `trialing` AND the event's `created` timestamp is newer than the row's `updatedAt`; block it otherwise. Add tests:
   - replayed event id → handler returns without touching `subscriptions`;
   - stale `customer.subscription.updated` (status `canceled` locally with null sub id, incoming event `created` older than row `updatedAt`) → no update;
   - legitimate re-subscribe (incoming `active`, newer `created`) → update proceeds.

**Verify**: `npm test` → all pass; migration file contains `stripe_webhook_events`.

### Step 5: Full pass

**Verify**: `npm run lint`, `npm run typecheck`, `npm test` → all exit 0. Manual smoke if Stripe CLI is available: `stripe listen --forward-to localhost:3000/api/subscription/webhook` + `stripe trigger customer.subscription.updated` → 200, one row in `stripe_webhook_events`; re-deliver the same event → still 200, still one row.

## Test plan

Covered in steps 2–4. Final suite: ≥ 12 cases across status mapping, period-end fabrication, idempotency, ordering. Model mocks on `business-access` tests (plan 005).

## Done criteria

- [ ] Webhook logic lives in `src/lib/stripe/webhook-handlers.ts`; route file only verifies + dispatches
- [ ] `incomplete`/`paused` subscriptions can never be written with a fabricated future `currentPeriodEnd` (test-proven)
- [ ] Duplicate event ids are no-ops (test-proven); `stripe_webhook_events` table exists
- [ ] Stale updates cannot resurrect a terminally-canceled row (test-proven)
- [ ] `npm run lint`, `npm run typecheck`, `npm test` exit 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Excerpts don't match live code (drift), especially if someone already restructured the webhook.
- Plan 005 has not landed (`npm test` is not a working command) — this plan must not proceed without it.
- The Stripe SDK types reject `current_period_end` on the subscription item (SDK version drift after plan 002) — report; do not cast with `as any`.
- `DATABASE_URL` unavailable for the migration — implement + test with mocks, report migration blocked.

## Maintenance notes

- The `stripe_webhook_events` table grows unboundedly; a follow-up cron could prune rows older than 30 days (Stripe's retry horizon is 3 days). Deferred deliberately.
- The `PLAN_BY_PRICE` module cache never invalidates within a running instance; if admin changes price ids in `platformSettings`, instances serve stale mappings until restart. Known, accepted at planning time — note for the future.
- Reviewer should scrutinize Step 4's re-subscribe allowance: the guard must not lock out a customer who cancels and later re-subscribes (test case 3 covers it).
