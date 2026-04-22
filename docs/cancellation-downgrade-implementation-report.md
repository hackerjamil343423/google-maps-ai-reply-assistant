# Cancellation & Downgrade — Implementation Report

**Date:** 2026-04-22
**Status:** Implemented, TypeScript clean, ESLint clean
**Plan reference:** [docs/cancellation-downgrade-plan.md](./cancellation-downgrade-plan.md)

---

## Summary

Implemented full cancellation and plan-downgrade flows for StreamPay subscriptions. Since StreamPay has no native "cancel at period end" option, the behavior is reproduced in the application layer: StreamPay cancels immediately, but our access control grants access until `currentPeriodEnd` expires. Downgrades reuse the cancellation path and email the user a fresh checkout link for the lower plan once the period ends.

---

## Files Changed / Added

### Database
- **[src/lib/db/schema.ts](../src/lib/db/schema.ts#L359-L378)** — Added `cancelAtPeriodEnd boolean` and `scheduledDowngradePlan text` columns to `subscriptions` table
- **[drizzle/0007_subscription_cancel_and_downgrade.sql](../drizzle/0007_subscription_cancel_and_downgrade.sql)** — New migration (manually authored because drizzle-kit meta was out of sync with committed migrations)
- **[drizzle/meta/_journal.json](../drizzle/meta/_journal.json)** — Registered migration 0007 in journal

### Backend
- **[src/lib/streampay/client.ts](../src/lib/streampay/client.ts)** — Added `cancelSubscription()` and `getSubscription()` functions + `StreamSubscription` type
- **[src/lib/subscription/server.ts](../src/lib/subscription/server.ts#L42-L51)** — `getWorkspaceAccess()` now allows access when `status = "canceled"` but `currentPeriodEnd` is still in the future (cancel-at-period-end UX)
- **[src/app/api/subscription/cancel/route.ts](../src/app/api/subscription/cancel/route.ts)** — NEW: `POST /api/subscription/cancel`
- **[src/app/api/subscription/downgrade/route.ts](../src/app/api/subscription/downgrade/route.ts)** — NEW: `POST /api/subscription/downgrade`
- **[src/app/api/subscription/webhook/route.ts](../src/app/api/subscription/webhook/route.ts)** — `SUBSCRIPTION_CANCEL_AT_PERIOD_END` now updates DB flag; `SUBSCRIPTION_CANCELED` now sends downgrade email when `scheduledDowngradePlan` is set; keeps `currentPeriodEnd` intact
- **[src/app/api/subscription/route.ts](../src/app/api/subscription/route.ts#L117-L118)** — Returns `cancelAtPeriodEnd` and `scheduledDowngradePlan` fields

### Emails
- **[src/lib/email-templates.ts](../src/lib/email-templates.ts)** — Added `buildCancellationScheduledEmailHtml/Text` and `buildDowngradeReadyEmailHtml/Text`
- **[src/lib/emails.ts](../src/lib/emails.ts)** — Added `sendCancellationScheduledEmail()` and `sendDowngradeReadyEmail()`

### Frontend
- **[src/app/dashboard/settings/page.tsx](../src/app/dashboard/settings/page.tsx)** — Extended `SubscriptionState`, added `PLAN_RANK` constant, cancel/downgrade dialogs, state + handlers, cancel-at-period-end banner, downgrade-scheduled banner, "Cancel subscription" link on current plan, "Downgrade" button on lower plans, auto-checkout deep link handler

---

## Flow: User Cancels Subscription

1. User clicks **"Cancel subscription"** on current plan card
2. Confirmation dialog shows current plan end date
3. User clicks **"Cancel at period end"**
4. Frontend → `POST /api/subscription/cancel`
5. Backend:
   - Verifies subscription is `active` or `past_due`
   - Calls StreamPay `POST /subscriptions/{id}/cancel` with `{ cancel_ongoing_invoices: false }`
   - Sets `cancelAtPeriodEnd = true` in DB
   - Sends cancellation confirmation email
6. StreamPay fires `SUBSCRIPTION_CANCELED` webhook immediately
7. Webhook handler:
   - Sets `status = "canceled"`
   - Clears `cancelAtPeriodEnd` and `scheduledDowngradePlan`
   - Keeps `currentPeriodEnd` intact
8. **User keeps full access** until `currentPeriodEnd` passes because `server.ts` allows `canceled + currentPeriodEnd > now`
9. UI shows orange "Subscription ends on [date]" banner + "Re-subscribe" button

---

## Flow: User Downgrades Plan

1. User clicks **"Downgrade"** on a lower plan card (appears only when current plan is higher-tier)
2. Dialog shows effective date + **account excess warning** if connected profiles > new plan max
3. User clicks **"Schedule downgrade"**
4. Frontend → `POST /api/subscription/downgrade { targetPlan }`
5. Backend:
   - Validates target is a lower plan than current
   - Rejects if any cancellation/downgrade already scheduled
   - Computes account excess warning
   - **Persists** `cancelAtPeriodEnd = true` AND `scheduledDowngradePlan = targetPlan` (BEFORE the StreamPay call, to avoid a webhook race)
   - Calls StreamPay cancel
   - Rolls back the DB flags if the StreamPay call fails
6. StreamPay fires `SUBSCRIPTION_CANCELED` webhook (within seconds)
7. Webhook handler:
   - Sets `status = "canceled"` and clears `cancelAtPeriodEnd`
   - **Preserves** `scheduledDowngradePlan` and `currentPeriodEnd` so the cron can send the email later
8. User keeps access to the old plan until `currentPeriodEnd` passes
9. Daily cron job runs; once `currentPeriodEnd < now` and `scheduledDowngradePlan != null`:
   - Sends **"Downgrade Ready"** email with deep link: `/dashboard/settings?section=billing&autoCheckout=<newPlan>`
   - Clears `scheduledDowngradePlan` (idempotent — only fires once)
10. User clicks email link → billing page auto-launches StreamPay checkout for the new plan
11. User pays → callback activates the new plan → fresh `streamSubscriptionId`, `status = "active"`

---

## Access Control Behavior Change

**Before:** `status === "canceled"` → access immediately denied.

**After:** `status === "canceled"` + `currentPeriodEnd > now` → access granted. Only when the period expires does access drop.

This is the single change that makes "cancel at period end" work without StreamPay supporting it natively.

---

## Webhook Changes

| Event | Before | After |
|---|---|---|
| `SUBSCRIPTION_CANCEL_AT_PERIOD_END` | Log only | Sets `cancelAtPeriodEnd = true` (safety net for API route) |
| `SUBSCRIPTION_CANCELED` | Mark `status = "canceled"` | Same + clears `cancelAtPeriodEnd` + **preserves** `scheduledDowngradePlan` and `currentPeriodEnd` (so the cron job can send the activation email at the right time) |

All other events (`INVOICE_COMPLETED`, `SUBSCRIPTION_FROZEN`, `SUBSCRIPTION_CYCLE_RENEWAL_FAILED`, `SUBSCRIPTION_INACTIVATED`) unchanged.

## Cron Changes

**`/api/cron/subscription-expiry`** now has two responsibilities:

1. Mark expired active subscriptions as `past_due` (existing behavior, unchanged).
2. **New:** For rows with `status=canceled + scheduledDowngradePlan != null + currentPeriodEnd < now`, send `sendDowngradeReadyEmail` with the auto-checkout deep link, then null out `scheduledDowngradePlan` to make the emailing idempotent.

This delays the downgrade activation email until the paid period actually ends, instead of firing it seconds after the user schedules the downgrade.

---

## StreamPay API Calls Used

Confirmed from `https://docs.streampay.sa`:

| Endpoint | Purpose |
|---|---|
| `POST /api/v2/subscriptions/{id}/cancel` with `{ cancel_ongoing_invoices: false }` | Immediate cancellation, preserves current paid invoice |
| `GET /api/v2/subscriptions/{id}` | Added for future diagnostic use; not called in current flow |

No use of Update, Freeze, or Create endpoints for these flows.

---

## Key Design Decisions

1. **No native cancel-at-period-end in StreamPay** → implemented in `server.ts` by allowing `canceled + currentPeriodEnd > now`
2. **No plan-change API in StreamPay** → downgrade = cancel + new checkout via email
3. **No reactivation API in StreamPay** → "Re-subscribe" button goes through fresh checkout (user pays again for a new month)
4. **Account limits on downgrade:** warned, not enforced. Existing connections remain after downgrade; `/api/google/connect` already blocks new ones over the limit
5. **`cancel_ongoing_invoices: false`** → the current invoice stays settled; no refund attempt

---

## Validation

```bash
npx tsc --noEmit    # exit 0 — no type errors
npx eslint src/...  # only one pre-existing unrelated warning (summary var)
```

---

## Remaining Deployment Steps

These must be done in the hosting environment before the feature goes live:

1. **Apply the DB migration:** `npm run db:push` (or run `drizzle/0007_subscription_cancel_and_downgrade.sql` manually against Neon)
2. **Register the webhook URL in StreamPay dashboard** (should already be registered from the earlier webhook work; verify `SUBSCRIPTION_CANCEL_AT_PERIOD_END` is in the subscribed events list)
3. **Smoke test** in staging:
   - Subscribe to a plan
   - Click "Cancel subscription" → verify email arrives, banner appears, access continues
   - Let period elapse or manually set `currentPeriodEnd` backward → verify access is blocked
   - From a higher-tier subscription, click "Downgrade" → verify dialog, confirmation, and downgrade-ready email with auto-checkout link
   - Click email link → verify checkout auto-launches

---

## Out of Scope

- **Refunds** for immediate cancellation (StreamPay has no refund API; not in plan)
- **Freeze subscription** feature (StreamPay supports it, but it's not a cancellation/downgrade concern)
- **Plan seat/quota limits** for team members or AI replies (separate feature gap)
- **Force-disconnect excess accounts** on downgrade (only a warning is shown)
- **Plan upgrade with proration** mid-cycle (StreamPay payment-link model does not support proration)
