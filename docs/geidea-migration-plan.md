> **SUPERSEDED (2026-06)**: Billing migrated to Stripe (see `docs/stripe-migration-plan.md`
> and commit `149125b1`). This document is retained as history only; the Geidea
> integration code has been removed from the codebase.

# Plan: Replace StreamPay with Geidea Payment Gateway

## Context

The app currently uses **StreamPay** (Saudi payment gateway) for all billing — checkout, subscriptions, webhooks, cancellation, and downgrades. We're replacing it entirely with **Geidea**, the leading MENA payment platform (KSA region, SAR currency). Geidea offers a native **Subscriptions API** that handles recurring billing automatically, unlike StreamPay which required manual period management. This simplifies the codebase significantly.

**Region:** KSA (`api.ksamerchant.geidea.net`)
**Currency:** SAR (same as current)
**Integration:** HPP Checkout (popup modal) + Geidea Subscriptions API (native recurring)

---

## Architecture Change

```
CURRENT (StreamPay):
  checkout → createConsumer → createPaymentLink → redirect to StreamPay → callback+webhook
  renewal → manual (cron calculates periods, webhooks extend)

NEW (Geidea):
  checkout → createSubscription → createSession(sessionId) → Geidea HPP modal → callback
  renewal → Geidea auto-charges (native recurring, callbacks notify us)
```

**Key improvement:** Geidea manages recurring billing natively. We no longer need to manually extend `currentPeriodEnd` — Geidea charges the card automatically and sends callbacks for each occurrence.

---

## Phase 1: Geidea Client Library

### Create `src/lib/geidea/client.ts` (replaces `src/lib/streampay/client.ts`)

**Functions to implement:**

| Function | Geidea API Endpoint | Purpose |
|---|---|---|
| `generateSignature()` | — (local HMAC-SHA256) | Create request signatures |
| `validateCallbackSignature()` | — (local) | Verify callback authenticity |
| `createSubscription()` | `POST /subscriptions/api/v1/direct/subscription` | Create recurring subscription |
| `createSession()` | `POST /payment-intent/api/v2/direct/session` | Create checkout session (with subscriptionId) |
| `getSubscription()` | `GET /subscriptions/api/v1/direct/subscription/{id}` | Fetch subscription status |
| `cancelSubscription()` | `POST /subscriptions/api/v1/direct/subscription/{id}/cancel` | Cancel subscription |
| `getOrder()` | `GET /pgw/api/v1/direct/order?OrderId={id}` | Fetch order details (for callback verification) |

**Authentication:** HTTP Basic Auth — `base64(merchantPublicKey:apiPassword)`

**Signature formula:** HMAC-SHA256 of `{publicKey}{amount}{currency}{merchantRefId}{timestamp}` using API password as key, Base64-encoded.

### Create `src/lib/geidea/types.ts`

```typescript
GeideaSession       // { id, amount, currency, status, expiryDate }
GeideaSubscription  // { subscriptionId, status, occurrences, nextOccurrenceDate }
GeideaCallback      // Full order callback body (order, signature, timeStamp)
GeideaCustomer      // { name, email, phoneCountryCode, phone }
```

---

## Phase 2: Database Schema Changes

### Modify `src/lib/db/schema.ts` — `subscriptions` table

Rename columns (migration needed):

| Old Column | New Column | Notes |
|---|---|---|
| `streamConsumerId` | `geideaCustomerId` | Geidea customer ID (from subscription API) |
| `streamSubscriptionId` | `geideaSubscriptionId` | Geidea subscription ID |
| — | `geideaAgreementId` (new) | Card-on-file agreement ID |
| — | `geideaTokenId` (new) | Stored card token ID |

### Generate migration

```bash
npm run db:generate   # Creates migration with column renames + additions
npm run db:push       # Apply to database
```

---

## Phase 3: Update Plans Configuration

### Modify `src/lib/subscription/plans.ts`

**Replace** `STREAM_PRODUCT_*` env vars with plan-level config:

```typescript
// Old: getPlanProductId(plan, interval) → env var lookup
// New: getPlanGeideaConfig(plan, interval) → { amount, cycleInterval, cycleFrequency }
```

Geidea uses direct amount values instead of product IDs:
- Monthly: `cycleInterval: "month"`, `cycleFrequency: 1`
- Yearly: `cycleInterval: "year"`, `cycleFrequency: 1`

**New env vars:**
```
GEIDEA_MERCHANT_PUBLIC_KEY
GEIDEA_API_PASSWORD
GEIDEA_CALLBACK_SECRET    # For callback signature validation
```

Remove all `STREAM_*` env vars.

---

## Phase 4: Rewrite API Routes

### 4a. Checkout — `src/app/api/subscription/checkout/route.ts`

**New flow:**
1. Auth check + validate plan/interval
2. Ensure workspace + subscription record
3. **Create Geidea customer** (if not exists) via `customerRequest` in subscription creation
4. **Create Geidea subscription** — `createSubscription()` with plan amount, cycle config
5. **Create Geidea session** — `createSession()` with the `subscriptionId`
6. Return `{ sessionId }` (instead of `{ checkoutUrl }`)

**Frontend** will use the `sessionId` to open the Geidea HPP modal directly (no redirect to external URL).

### 4b. Callback — `src/app/api/subscription/callback/route.ts`

**New flow:**
1. Receive POST callback from Geidea (not GET redirect)
2. **Validate callback signature** using `validateCallbackSignature()`
3. Verify `responseCode === "000"` and `detailedStatus === "Paid"`
4. Extract `subscriptionId`, `orderId`, `agreementId`, `tokenId` from callback body
5. Find subscription by `geideaSubscriptionId` in DB
6. Update: `plan`, `status: "active"`, `currentPeriodEnd` (from Geidea `nextOccurrenceDate`)
7. Store `geideaAgreementId` and `geideaTokenId` for future reference
8. Return HTTP 200 (Geidea expects this)

**Note:** The callback is a server-to-server POST, not a browser redirect. The frontend handles success/failure via the HPP JS callbacks (onSuccess/onError/onCancel) which redirect the user.

### 4c. Webhook Handler — `src/app/api/subscription/webhook/route.ts`

**Simplified:** Geidea uses the same `callbackUrl` for subscription occurrences (renewals, failures). The webhook endpoint now handles:

| Callback Type | Action |
|---|---|
| First payment (order with subscriptionId) | Activate subscription |
| Recurring occurrence paid | Extend `currentPeriodEnd` from `nextOccurrenceDate` |
| Recurring occurrence failed | Set `status: "past_due"`, send email |
| Subscription cancelled | Set `status: "canceled"` |

**Key difference:** No more separate webhook events — everything comes through the callback URL as order notifications.

### 4d. Cancel — `src/app/api/subscription/cancel/route.ts`

**New flow:**
1. Same pre-conditions
2. Call `geidea.cancelSubscription(geideaSubscriptionId)` with signature
3. Geidea cancels the subscription — remaining occurrences are stopped
4. Set `cancelAtPeriodEnd: true` in DB — access continues until `currentPeriodEnd`
5. Send cancellation email

**Note:** Geidea's cancel stops future charges immediately. We keep the soft-cancel UX by honoring `currentPeriodEnd` in access control (same as before).

### 4e. Downgrade — `src/app/api/subscription/downgrade/route.ts`

**Same logic as before:**
1. Cancel current Geidea subscription
2. Store `scheduledDowngradePlan`
3. Cron sends downgrade-ready email at period end
4. User checks out with new (lower) plan via new Geidea subscription

### 4f. GET Subscription — `src/app/api/subscription/route.ts`

**Changes:**
- Reference `geideaSubscriptionId` instead of `streamSubscriptionId`
- Optionally call `getSubscription()` to get real-time `nextOccurrenceDate` for `nextBillingAt`

---

## Phase 5: Frontend Changes

### Settings/Billing Page — `src/dashboard/settings/page.tsx`

1. Add Geidea checkout JS script tag:
   ```html
   <Script src="https://www.ksamerchant.geidea.net/hpp/geideaCheckout.min.js" />
   ```

2. Replace checkout flow:
   - Old: Redirect browser to `checkoutUrl` (StreamPay hosted page)
   - New: Call checkout API → get `sessionId` → open Geidea HPP modal:
   ```typescript
   const payment = new GeideaCheckout(onSuccess, onError, onCancel);
   payment.startPayment(sessionId);
   ```

3. Handle HPP callbacks:
   - `onSuccess`: Redirect to `/dashboard/subscription?success=true`
   - `onError`: Show error toast, redirect to billing page
   - `onCancel`: Redirect to billing page with cancel message

### Checkout API response change:
- Old: `{ checkoutUrl: string }`
- New: `{ sessionId: string }`

---

## Phase 6: Update Supporting Files

### `src/lib/subscription/server.ts`
- Update all references from `streamConsumerId`/`streamSubscriptionId` to `geideaCustomerId`/`geideaSubscriptionId`
- Access control logic stays the same (checks `status`, `currentPeriodEnd`, `cancelAtPeriodEnd`)

### `src/lib/emails.ts`
- No changes needed (email templates don't reference payment gateway)

### Cron jobs (`src/app/api/cron/subscription-expiry/route.ts`, `trial-expiry/route.ts`)
- Update column name references
- Logic stays the same

### Delete `src/lib/streampay/client.ts`
- Remove entirely after migration is complete

---

## Phase 7: Environment Variables

### Remove:
```
STREAM_API_KEY
STREAM_API_SECRET
STREAM_WEBHOOK_SECRET
STREAM_PRODUCT_LOCAL_BUSINESS
STREAM_PRODUCT_LOCAL_BUSINESS_YEARLY
STREAM_PRODUCT_MULTI_LOCATION
STREAM_PRODUCT_MULTI_LOCATION_YEARLY
STREAM_PRODUCT_AGENCY_MAX
STREAM_PRODUCT_AGENCY_MAX_YEARLY
```

### Add:
```
GEIDEA_MERCHANT_PUBLIC_KEY     # Merchant public key (GUID)
GEIDEA_API_PASSWORD            # API password / secret key
NEXT_PUBLIC_APP_URL            # Keep (for callback URLs)
```

### Update `.env.example`

---

## Files to Modify (Summary)

| File | Action |
|---|---|
| `src/lib/geidea/client.ts` | **CREATE** — Geidea API client |
| `src/lib/geidea/types.ts` | **CREATE** — TypeScript types |
| `src/lib/streampay/client.ts` | **DELETE** |
| `src/lib/db/schema.ts` | **MODIFY** — Rename columns, add new columns |
| `drizzle/XXXX_migration.sql` | **GENERATE** — Schema migration |
| `src/lib/subscription/plans.ts` | **MODIFY** — Replace product ID mapping with Geidea config |
| `src/lib/subscription/server.ts` | **MODIFY** — Update column references |
| `src/app/api/subscription/checkout/route.ts` | **REWRITE** — Geidea subscription + session flow |
| `src/app/api/subscription/callback/route.ts` | **REWRITE** — Geidea callback handler |
| `src/app/api/subscription/webhook/route.ts` | **REWRITE** — Geidea occurrence handler |
| `src/app/api/subscription/cancel/route.ts` | **MODIFY** — Use Geidea cancel API |
| `src/app/api/subscription/downgrade/route.ts` | **MODIFY** — Use Geidea cancel API |
| `src/app/api/subscription/route.ts` | **MODIFY** — Update column refs |
| `src/app/dashboard/settings/page.tsx` | **MODIFY** — Geidea HPP modal checkout |
| `src/app/api/cron/subscription-expiry/route.ts` | **MODIFY** — Update column refs |
| `src/app/api/cron/trial-expiry/route.ts` | **MODIFY** — Update column refs |
| `docs/billing-subscription-system.md` | **REWRITE** — Update documentation |
| `.env.example` | **MODIFY** — Replace StreamPay vars with Geidea |

---

## Verification Plan

1. **Unit tests:** Run `npm run typecheck` and `npm run lint` after all changes
2. **Manual checkout test:**
   - Start dev server (`npm run dev`)
   - Go to billing page → select plan → click upgrade
   - Verify Geidea HPP modal opens with correct amount (SAR)
   - Use test card `5123450000000008` / CVV `100` / Exp `01/39`
   - Verify callback updates DB: status=active, plan set, currentPeriodEnd set
3. **Subscription renewal:** Verify Geidea auto-charges on next cycle (test with `cycleInterval: "day"` for quick testing)
4. **Cancel test:** Cancel subscription → verify Geidea stops future charges → verify access continues until period end
5. **Downgrade test:** Schedule downgrade → verify cancel + scheduledDowngradePlan stored → cron sends email at period end
6. **Access control:** Verify `getWorkspaceAccess()` still works correctly with renamed columns
