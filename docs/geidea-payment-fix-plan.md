# Geidea Payment Gateway — Full Audit & Fix Plan

**Date:** 2026-06-02
**Region:** KSA (`api.ksamerchant.geidea.net`) · **Currency:** SAR · **Model:** Recurring subscriptions (not one-time)
**Reviewed against:** live code + official Geidea docs (Subscriptions, Create Session, Create Session‑Subscription, Cancel Subscription, HPP Checkout v2, Callback/Webhook).

---

## 0. TL;DR — what is actually broken

Your `502 Bad Gateway` on `POST /api/subscription/checkout` is caused by **one wrong API path**. Everything else in the flow (create subscription, signature, DB schema, frontend HPP modal, cron safety net) is correct.

| # | Severity | Bug | Effect | Fix |
|---|----------|-----|--------|-----|
| **B1** | 🔴 Blocker | `createSession()` calls `/payment-intent/api/v2/direct/**session-subscription**` which **404s** on the KSA gateway | Checkout dies → route returns 502 | Call `/payment-intent/api/v2/direct/**session**` with `subscriptionId` in the body (the documented subscription‑session endpoint) |
| **B2** | 🔴 Blocker (cancel/cleanup/downgrade) | `cancelSubscription()` sends **no signature** | `710 / 022 "Missing Signature"` — orphan cleanup fails, and real **Cancel & Downgrade are broken** | Add `signature = Base64(HMAC_SHA256(publicKey+subscriptionId, apiPassword))` to the request body |
| B3 | 🟡 Robustness | Session body field is `timeStamp` (docs use `timestamp`) | Works today (ASP.NET binding is case‑insensitive) but is doc‑divergent and fragile | Rename to `timestamp` in `createSession`/`createPaymentSession` |
| B4 | 🟡 Correctness | Callback signature validation is an 8‑candidate "shotgun" | Works for the happy path but is unmaintainable and can silently mis‑validate | Implement the **one** documented formula; keep a small fallback only for the amount‑decimals ambiguity |
| B5 | 🟠 Product | On `710/009` (subscriptions not enabled) checkout silently falls back to a **one‑time** payment | A "subscription" that never renews → revenue leak / confused access state | Treat as hard config error; don't silently sell a one‑time charge as a subscription |
| B6 | 🟠 Reliability | Renewal/paid callbacks have **no idempotency key** | A retried webhook re‑extends the period / re‑sends emails | Dedupe on Geidea `orderId` (store last processed order id) |
| B7 | 🟠 Ops | No account‑level webhook documented/configured in the Geidea portal | **Auto‑renewals & failed‑charge notifications never reach the app** → period never extends, cron eventually marks `past_due` | Configure default callback/webhook URL in Geidea portal → `/api/subscription/webhook` |

> Fixing **B1 alone** makes checkout work end‑to‑end. **B2** is required for Cancel/Downgrade. **B7** is required for renewals to actually extend access.

---

## 1. Reading your production log (trace)

```
[checkout] saved Geidea customer not found for workspace c557…; retrying with customerRequest   ← createSubscription recovered OK (returned a subscriptionId)
[checkout] createSession failed: Error: Geidea API failed: 404                                    ← B1: wrong session endpoint → 404
[checkout] failed to cancel orphaned Geidea subscription: GeideaProviderError: Subscriptions
          failed - Missing Signature  { responseCode: '710', detailedResponseCode: '022' }        ← B2: cancel has no signature
```

So: **the subscription was created successfully**, then the **session call 404'd**, then the **cleanup cancel failed** because it has no signature. The route's `catch` returns `502` → the browser error you saw. The subscription signature, auth (Basic), customer recovery logic, and DB writes are all working.

---

## 2. Is Geidea a good fit for a *subscription* product? — Yes

Geidea has a **native Subscriptions API** (`/subscriptions/api/v1/direct/subscription`) with server‑side auto‑debit (`typeOfPayment: "RecurringPayment"`, `isFirstPmtPBL: false`). The first payment is collected via HPP (card‑on‑file tokenization), and Geidea auto‑charges the saved token every cycle. This is exactly what your code does and is the correct model for SaaS recurring billing. Confirmed fit. The integration shape (createSubscription → createSession(subscriptionId) → HPP modal → callback) matches Geidea's documented subscription flow.

Two model‑level cautions, addressed below: (a) the one‑time fallback (B5) silently degrades the model, and (b) renewals depend on a portal‑configured webhook (B7).

---

## 3. The confirmed Geidea contract (from the docs)

**Endpoints (KSA base `https://api.ksamerchant.geidea.net`):**

| Operation | Method & Path |
|---|---|
| Create subscription | `POST /subscriptions/api/v1/direct/subscription` |
| **Create session (subscription) ✅ USE THIS** | `POST /payment-intent/api/v2/direct/session`  *(pass `subscriptionId` in body)* |
| Create session (one‑time) | `POST /payment-intent/api/v2/direct/session` |
| ❌ NOT this for KSA | `POST /payment-intent/api/v2/direct/session-subscription` *(your current call → 404)* |
| Cancel subscription | `POST /subscriptions/api/v1/direct/subscription/{id}/cancel` |
| Get subscription | `GET /subscriptions/api/v1/direct/subscription/{id}` |

**Auth:** HTTP Basic `base64(merchantPublicKey:apiPassword)` — already correct.

**Signature formulas (HMAC‑SHA256 keyed by API password, Base64):**

| Call | Concatenation (then HMAC‑SHA256 → Base64) |
|---|---|
| Create **session** request | `publicKey + amount(2dp) + currency + merchantReferenceId + timestamp` ✅ matches your `generateSignature` |
| Create **subscription** request | `publicKey + amount(2dp) + currency + timestamp` ✅ matches your `generateSubscriptionSignature` |
| **Cancel** subscription request | `publicKey + subscriptionId` ⛔ **missing in your code (B2)** |
| **Callback** verification | `publicKey + orderAmount + orderCurrency + orderId + status + merchantReferenceId + timeStamp` |

> Amount is formatted to 2 decimals (`number_format($amount,2)` / `toFixed(2)`). Your `formatAmountForSignature` already does this.
> The same `timestamp` string must appear in both the body and the signature input — Geidea recomputes using the body value, so internal consistency is what matters (format is otherwise free‑form).

---

## 4. The fixes (exact code)

### B1 — Point the subscription session at the real endpoint
**File:** `src/lib/geidea/client.ts` → `createSession()`

```diff
   const data = await geideaFetch<
     (GeideaSession & { sessionId?: string }) | { session: GeideaSession & { sessionId?: string } }
   >(
-    "/payment-intent/api/v2/direct/session-subscription",
+    "/payment-intent/api/v2/direct/session",
     {
       method: "POST",
       body: JSON.stringify(body),
     }
   );
```

The body already carries `subscriptionId`, `cardOnFile: true`, `callbackUrl`, `returnUrl`, `merchantReferenceId`, and the correct `generateSignature(...)`. That is precisely the documented "Create Session – Subscription" request. (`cardOnFile: true` is harmless/beneficial here — it guarantees `tokenId` is returned in the callback.)

> Note: `merchantReferenceId` must be a valid UUID. You pass `workspaceId` (a UUID) — good.

### B2 — Sign the cancel request
**File:** `src/lib/geidea/client.ts` → `cancelSubscription()`

```diff
 export async function cancelSubscription(subscriptionId: string): Promise<void> {
-  await geideaFetch(
-    `/subscriptions/api/v1/direct/subscription/${encodeURIComponent(subscriptionId)}/cancel`,
-    {
-      method: "POST",
-      body: JSON.stringify({}),
-    }
-  );
+  const { publicKey, apiPassword } = getCredentials();
+  const signature = hmacBase64(`${publicKey}${subscriptionId}`, apiPassword);
+  await geideaFetch(
+    `/subscriptions/api/v1/direct/subscription/${encodeURIComponent(subscriptionId)}/cancel`,
+    {
+      method: "POST",
+      body: JSON.stringify({ signature }),
+    }
+  );
 }
```

This fixes the orphan‑cleanup in checkout **and** the real `/api/subscription/cancel` and `/api/subscription/downgrade` flows, which today are silently broken (every cancel returns 502 and rolls back the DB flag).

### B3 — Match the documented field name
**File:** `src/lib/geidea/client.ts` (in `createSession` and `createPaymentSession`)

```diff
-    timeStamp: timestamp,
+    timestamp: timestamp,
```

(Optional but recommended; removes a latent case‑sensitivity dependency. The subscription call already uses `timestamp`.)

### B4 — One documented callback‑signature formula
**File:** `src/lib/geidea/client.ts` → replace the 8‑candidate block in `validateCallbackSignature()` with the documented concatenation, keeping only a raw‑vs‑2dp amount fallback (the one genuine ambiguity):

```ts
const orderAmount = callback.amount ?? order?.amount;
const orderCurrency = callback.currency ?? order?.currency ?? "";
const orderId = callback.orderId ?? order?.orderId ?? order?.id ?? "";
const status = callback.status ?? order?.status ?? ""; // "Success" / "Failed"
const merchantReferenceId = callback.merchantReferenceId ?? order?.merchantReferenceId ?? "";
const timeStamp = callback.timeStamp ?? callback.timestamp ?? "";

const candidates = [String(orderAmount ?? ""), formatAmountForSignature(orderAmount)].map((amt) =>
  hmacBase64(`${publicKey}${amt}${orderCurrency}${orderId}${status}${merchantReferenceId}${timeStamp}`, secret)
);
return candidates.some((c) => timingSafeEqualText(c, signature));
```

> Keep `secret = process.env.GEIDEA_CALLBACK_SECRET ?? apiPassword`. **Leave `GEIDEA_CALLBACK_SECRET` unset in production** — the callback HMAC key *is* the API password. A wrong value here makes every callback fail with 401 and subscriptions will never activate.

### B5 — Don't silently sell a one‑time charge as a subscription
**File:** `src/app/api/subscription/checkout/route.ts`

The current `isGeideaSubscriptionNotEnabledError` branch creates a `createPaymentSession` (one‑time) that will **never renew**. For a subscription product this is a config failure, not a fallback. Recommended: return a 503 "recurring billing not enabled on merchant account — contact support" and alert, instead of charging once. If you intentionally want a one‑time bridge, set `billingInterval`/status so access still expires and the user is prompted to re‑subscribe (don't mark it as a healthy recurring subscription).

### B6 — Idempotent paid callbacks
**File:** `src/app/api/subscription/webhook/route.ts`

Add a `geideaLastOrderId text` column (migration) and skip processing if the incoming `orderId` equals the stored one. Prevents double period‑extension / duplicate emails on Geidea retries. (Geidea retries callbacks; this is real.)

---

## 5. Backend gaps (beyond the blockers)

1. **Renewal handling is correct but untested in prod** — on an auto‑debit occurrence Geidea posts the order callback; `isPaid()` → extend `currentPeriodEnd` from `nextOccurrenceDate`. Verify with a fast cycle (`cycleInterval:"day"`) in test.
2. **Plan/interval only on first payment** — renewals arrive without `?plan&interval`; the webhook correctly falls back to `sub.plan`/`sub.billingInterval`. ✅ keep.
3. **`merchantReferenceId` may be null in some callbacks** — you set it on the session so it should echo back, but the webhook already prefers lookup by `geideaSubscriptionId` first. ✅ robust.
4. **Failed‑charge path** — `isFailed()` → `past_due` + email. Good. Confirm Geidea's failed‑occurrence callback `status`/`detailedStatus` strings match (`Failed`/`Declined`).
5. **Cron safety net** — `subscription-expiry` marks stale `active` subs `past_due` after a 2‑day grace. ✅ keep; it's the backstop if B7 isn't configured.

## 6. Frontend gaps — minor

`src/app/dashboard/settings/page.tsx` is correct: loads the **KSA** HPP script, POSTs to checkout, opens `new GeideaCheckout(onSuccess,onError,onCancel)` and `startPayment(sessionId)`. Suggested polish:
- On `onSuccess`, the DB is updated by the **server‑to‑server callback**, which may land a moment later — after redirect, poll `GET /api/subscription` (or show "activating…") so the UI doesn't show the old plan for a few seconds.
- `onCancel` currently shows "Payment failed"; show a neutral "cancelled" message instead.

## 7. Operational checklist (Geidea merchant portal / account)

- [ ] **Enable "Subscriptions / Recurring Payments"** and **Tokenization (card‑on‑file)** on the **KSA MID**. (If `710/009` appears, it's off.)
- [ ] **Configure the default callback/webhook URL** in the portal → `https://stars.wakkelni.ai/api/subscription/webhook`. **Required for auto‑renewal + failed‑charge notifications.** Without it, only the first payment notifies you.
- [ ] Confirm `GEIDEA_MERCHANT_PUBLIC_KEY` / `GEIDEA_API_PASSWORD` are the **production KSA** credentials (not Egypt/UAE, not test).
- [ ] Ensure `NEXT_PUBLIC_APP_URL = https://stars.wakkelni.ai` so callback/return URLs are correct and HTTPS (Geidea requires https callback).
- [ ] **Leave `GEIDEA_CALLBACK_SECRET` empty** (callback key = API password).

## 8. Environment variables (current — OK)

```
GEIDEA_MERCHANT_PUBLIC_KEY=   # KSA production public key (GUID)
GEIDEA_API_PASSWORD=          # KSA production API password
GEIDEA_CALLBACK_SECRET=       # leave EMPTY in prod (defaults to API password)
NEXT_PUBLIC_APP_URL=https://stars.wakkelni.ai
CRON_SECRET=                  # protects /api/cron/* (recommended)
```

## 9. Implementation order

1. **B1** (1 line) → checkout works. Deploy, test a real card.
2. **B2** → cancel/downgrade work; orphan cleanup works.
3. **B7** (portal) → renewals + failures notify the app.
4. **B3, B4** → hardening.
5. **B5, B6** → correctness/idempotency (small migration for B6).

## 10. Test plan

- **Test card:** `5123 4500 0000 0008`, CVV `100`, Exp `01/39` (Geidea test Mastercard).
- **Checkout:** select plan → HPP modal opens with SAR amount → pay → callback sets `status=active`, `plan`, `currentPeriodEnd`, stores `geideaSubscriptionId/agreementId/tokenId`.
- **Renewal (fast):** temporarily create with `cycleInterval:"day"` → confirm auto‑debit callback extends `currentPeriodEnd`.
- **Cancel:** `/api/subscription/cancel` → Geidea returns success (no 710/022) → `cancelAtPeriodEnd=true`, access until period end.
- **Downgrade:** schedules cancel + `scheduledDowngradePlan` → cron emails downgrade‑ready at period end.
- **Signature negatives:** tampered callback body → webhook returns 401.
- `npm run typecheck && npm run lint`.

---

### Appendix — files touched
- `src/lib/geidea/client.ts` — B1, B2, B3, B4 (the only file needed for the blockers)
- `src/app/api/subscription/checkout/route.ts` — B5
- `src/app/api/subscription/webhook/route.ts` (+ migration) — B6
- `src/app/dashboard/settings/page.tsx` — §6 polish
- Geidea merchant portal — §7 (no code)
> **SUPERSEDED (2026-06)**: Billing migrated to Stripe (see `docs/stripe-migration-plan.md`
> and commit `149125b1`). This document is retained as history only; the Geidea
> integration code has been removed from the codebase.
