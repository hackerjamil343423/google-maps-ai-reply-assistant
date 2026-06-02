# Geidea → Stripe Migration Plan

**Goal:** Remove the Geidea payment gateway entirely and run all billing on **Stripe** (recurring SaaS subscriptions), keeping the four plans (free, Local Business, Multi-Location, Agency Max), monthly/yearly intervals, and SAR currency.

**API version:** `2026-03-25.dahlia` · **SDK:** `stripe` (latest)

---

## 1. Strategy decision (why this is mostly *deletion*)

The current Geidea integration hand-rolls a lot that Stripe does natively:

| Hand-rolled today (Geidea) | Stripe replacement | Net effect |
|---|---|---|
| `createSubscription` + `createSession` two-step, customer recovery, duplicate-email aliasing (~200 lines in `checkout/route.ts` + `geidea/client.ts`) | **Checkout Session `mode: 'subscription'`** — one call, Stripe creates the customer + subscription + collects card | Delete ~250 lines |
| HMAC signature generation (`generateSignature`, `generateSubscriptionSignature`, two-candidate `validateCallbackSignature`) | `stripe.webhooks.constructEvent()` | Delete all signature code |
| Manual `cancelSubscription` + roll-back logic in `cancel/route.ts` and `downgrade/route.ts` | `stripe.subscriptions.update({ cancel_at_period_end })` / **Customer Portal** | Big simplification |
| `scheduledDowngradePlan` + downgrade-ready cron emails | Stripe **proration** or **Subscription Schedules** | Drop the column + half the cron |
| `currentPeriodEnd` tracking + 2-day grace expiry cron | Stripe is the source of truth; sync via webhook | Cron becomes a thin safety net |
| `geideaAgreementId`, `geideaTokenId` (card-on-file token plumbing) | Stripe stores the payment method on the Customer | Drop both columns |

**Recommended Stripe primitives:**
- **Products + Prices** — one Product per plan, two recurring Prices each (monthly/yearly) in SAR.
- **Checkout Sessions** (`mode: 'subscription'`) — initial subscribe + upgrades.
- **Customer Portal** — self-service upgrade/downgrade/cancel/update card (replaces the custom cancel & downgrade routes).
- **Webhooks** — the single source of truth that writes subscription state to our DB.

> Do **not** build PaymentIntent renewal loops. Billing APIs handle renewal, retries, and dunning. (Per Stripe billing best-practices.)

---

## 2. Environment variables

**Remove** (`.env.example`, `src/lib/env.ts`):
```
GEIDEA_MERCHANT_PUBLIC_KEY
GEIDEA_API_PASSWORD
GEIDEA_CALLBACK_SECRET
GEIDEA_BASE_URL
```

**Add:**
```
STRIPE_SECRET_KEY=sk_...            # already referenced in CLAUDE.md, now actually used
STRIPE_WEBHOOK_SECRET=whsec_...     # from `stripe listen` / dashboard endpoint
STRIPE_PUBLISHABLE_KEY=pk_...       # (optional) only if you use embedded Elements; redirect Checkout doesn't need it client-side
NEXT_PUBLIC_APP_URL=...             # already present, reused for success/cancel URLs
```

In `src/lib/env.ts` add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as `optionalNonEmptyString` and delete the three `GEIDEA_*` entries.

---

## 3. Schema changes

`src/lib/db/schema.ts` — `subscriptions` table:

```diff
 export const subscriptions = pgTable("subscriptions", {
   workspaceId: uuid("workspace_id").primaryKey().references(() => workspaces.id, { onDelete: "cascade" }),
   plan: text("plan").notNull().default("free"),
   status: subscriptionStatusEnum("status").notNull().default("trialing"),
-  geideaCustomerId: text("geidea_customer_id"),
-  geideaSubscriptionId: text("geidea_subscription_id"),
-  geideaAgreementId: text("geidea_agreement_id"),
-  geideaTokenId: text("geidea_token_id"),
+  stripeCustomerId: text("stripe_customer_id"),
+  stripeSubscriptionId: text("stripe_subscription_id"),
+  stripePriceId: text("stripe_price_id"),
   billingInterval: text("billing_interval").default("monthly"),
   trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
   currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
   cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
-  scheduledDowngradePlan: text("scheduled_downgrade_plan"),
   createdAt: ...,
   updatedAt: ...,
 });
```

Notes:
- Keep `status` enum (`trialing | active | past_due | canceled | …`) — it maps cleanly to Stripe's `subscription.status`.
- Keep `currentPeriodEnd`, `cancelAtPeriodEnd`, `billingInterval` — all set from webhook data.
- `scheduledDowngradePlan` can be **dropped** if we adopt immediate proration on downgrade (recommended). Keep it only if product wants "downgrade at period end" UX without the Customer Portal — see §6.
- Add a unique index on `stripeCustomerId` and `stripeSubscriptionId` for fast webhook lookups.

**Migration:** add `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`; drop the four geidea columns and `scheduled_downgrade_plan`. Generate with `npm run db:generate`, apply with `npm run db:push`. (Drop columns only after the data backfill in §9 if you have live Geidea subscribers.)

---

## 4. Plan ↔ Stripe Price mapping

Your prices are admin-editable (`platformSettings: billing.plan_prices.v1`). Stripe `Price` objects are **immutable**, so price edits must create a *new* Price and archive the old one.

**Mapping store:** extend `platformSettings` with a new key `billing.stripe_price_ids.v1`:
```json
{
  "Local Business": { "monthly": "price_...", "yearly": "price_..." },
  "Multi-Location": { "monthly": "price_...", "yearly": "price_..." },
  "Agency Max":     { "monthly": "price_...", "yearly": "price_..." }
}
```

**Bootstrap script** (`scripts/stripe-bootstrap.ts`, run once): create 3 Products + 6 Prices in SAR, print the IDs, store them in `platformSettings`. SAR amounts use the smallest unit (halalas, ×100): `149 SAR → unit_amount: 14900`.

**Admin price edits:** when an admin changes a plan price, create a new Stripe Price, archive the previous one (`active: false`), and update the mapping. Existing subscribers keep their old Price until they change plans (standard SaaS behavior). Add this to the admin settings handler that currently writes `billing.plan_prices.v1`.

Rewrite `src/lib/subscription/pricing.ts`:
- Drop `getEffectivePlanGeideaConfig` / `PlanGeideaConfig`.
- Add `getStripePriceId(plan, interval): Promise<string | null>` reading the mapping above.
- Keep `getEffectivePlanCatalog` / display-price logic unchanged (UI still shows DB prices).

`src/lib/subscription/plans.ts`: rename `PlanGeideaConfig` → remove; the catalog stays.

---

## 5. Backend changes (file by file)

### New: `src/lib/stripe/client.ts`
```ts
import Stripe from "stripe";
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" })
  : null;
```
Helper: `getOrCreateCustomer(workspaceId, email, name)` — reuse `stripeCustomerId` if set, else `stripe.customers.create({ email, name, metadata: { workspaceId } })` and persist it.

### Delete: `src/lib/geidea/client.ts`, `src/lib/geidea/types.ts` (whole folder)

### Rewrite: `src/app/api/subscription/checkout/route.ts`
Replace the entire `createRecoverableSubscription` / Geidea two-step with:
```ts
const customerId = await getOrCreateCustomer(workspaceId, user.email, user.name);
const priceId = await getStripePriceId(plan, billingInterval);
const checkout = await stripe.checkout.sessions.create({
  mode: "subscription",
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${appUrl}/dashboard/settings?section=billing&success=true&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url:  `${appUrl}/dashboard/settings?section=billing&error=cancelled`,
  subscription_data: { metadata: { workspaceId, plan, billingInterval } },
  client_reference_id: workspaceId,
  allow_promotion_codes: true,
});
return NextResponse.json({ url: checkout.url });   // <- return URL, not sessionId
```
The route no longer creates/updates the subscription row's provider IDs — the **webhook** does that. Keep the "create a free trialing row if none exists" bit.

### Rewrite: `src/app/api/subscription/webhook/route.ts` (the heart of the migration)
- Read the **raw body**: `const body = await req.text();` and `const sig = req.headers.get("stripe-signature")`.
- `const event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);` (replaces `validateCallbackSignature`).
- Add `export const config`/route segment so the body isn't parsed — in App Router, just don't call `req.json()`; use `req.text()`.
- Handle events (see §7). All DB writes keyed by `stripeSubscriptionId` or `client_reference_id`/`metadata.workspaceId`.
- `src/app/api/subscription/callback/route.ts` currently re-exports the webhook — **delete it** (Stripe uses one endpoint). Point the Stripe dashboard webhook at `/api/subscription/webhook`.

### Rewrite: `src/app/api/subscription/cancel/route.ts`
```ts
await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
// local cancelAtPeriodEnd flag is set by the subscription.updated webhook
```
Drop the manual roll-back dance — Stripe is authoritative; the webhook reconciles. Keep the confirmation email.

### Rewrite or remove: `src/app/api/subscription/downgrade/route.ts`
Two options (pick in §6). If keeping a custom route:
```ts
await stripe.subscriptions.update(sub.stripeSubscriptionId, {
  items: [{ id: currentItemId, price: targetPriceId }],
  proration_behavior: "create_prorations", // immediate, or "none" + schedule for period-end
});
```
**Recommended:** delete this route and the custom cancel route, and route both through the **Customer Portal** (§6) — far less surface area.

### Rewrite: `src/app/api/subscription/route.ts` (GET status)
- Remove `getGeideaSubscription` live call + the `geidea-sub:` cache.
- `nextBillingAt` now comes straight from `subscription.currentPeriodEnd` (kept fresh by webhooks). Optionally fetch `stripe.subscriptions.retrieve` for absolute freshness, but the DB value is canonical.
- Drop references to `scheduledDowngradePlan` if that column is removed.

### Trim: `src/app/api/cron/subscription-expiry/route.ts`
- Keep **part 1** (mark stale `active` subs `past_due`) as a safety net for missed webhooks, but Stripe's `invoice.payment_failed` webhook already does this — keep the cron as belt-and-suspenders with a longer grace window.
- **Delete part 2** (downgrade-ready emails) if `scheduledDowngradePlan` is removed.

### `src/lib/subscription/cache.ts`
- Remove `geidea-sub:*` usage. Cache can stay for other uses or be deleted if now unused.

---

## 6. Self-service management: Customer Portal (recommended)

Instead of maintaining custom cancel + downgrade routes and their email/cron choreography, add **one** route:

`src/app/api/subscription/portal/route.ts`
```ts
const portal = await stripe.billingPortal.sessions.create({
  customer: sub.stripeCustomerId,
  return_url: `${appUrl}/dashboard/settings?section=billing`,
});
return NextResponse.json({ url: portal.url });
```
Configure the Portal once in the Stripe dashboard: allow plan switching (list the 6 Prices), cancellations (at period end), and payment-method updates. All resulting changes flow back through `customer.subscription.updated|deleted` webhooks.

This lets you **delete** `cancel/route.ts`, `downgrade/route.ts`, `scheduledDowngradePlan`, and the downgrade-cron email logic. If product insists on in-app cancel/downgrade buttons, keep the thin routes from §5 instead — but the Portal is the best-practice path.

---

## 7. Webhook event handling

| Event | Action in our DB |
|---|---|
| `checkout.session.completed` | Look up workspace via `client_reference_id`; persist `stripeSubscriptionId`, `stripeCustomerId`; (status set by the subscription event that follows) |
| `customer.subscription.created` / `customer.subscription.updated` | Map `status`→our enum; set `plan` from `items[0].price` (reverse-map via the price→plan table), `billingInterval` from price recurring interval, `currentPeriodEnd` from `current_period_end`, `cancelAtPeriodEnd` from `cancel_at_period_end`, `stripePriceId` |
| `customer.subscription.deleted` | `status = "canceled"`, clear `stripeSubscriptionId` |
| `invoice.paid` | `status = "active"`, refresh `currentPeriodEnd`; clears `past_due` |
| `invoice.payment_failed` | `status = "past_due"`; send `sendRenewalFailedEmail` (reuse existing) |

Status map: `trialing→trialing`, `active→active`, `past_due|unpaid→past_due`, `canceled|incomplete_expired→canceled`. Keep webhook **idempotent** (writes are last-write-wins keyed by subscription id) and return `200` quickly. Reuse the existing rate-limit + the `sendRenewalFailedEmail` plumbing.

---

## 8. Frontend changes (`src/app/dashboard/settings/page.tsx`)

1. **Remove** the Geidea hosted-checkout `<Script src="…geideaCheckout.min.js">` and the `window.GeideaCheckout` typing/`checkoutReady` state.
2. **`startUpgrade`** becomes a redirect:
   ```ts
   const res = await fetch("/api/subscription/checkout", { method: "POST", body: JSON.stringify({ plan, billingInterval: selectedInterval }) });
   const { url } = await res.json();
   window.location.href = url;   // Stripe-hosted Checkout
   ```
   Delete the embedded `new window.GeideaCheckout(...)` success/fail/cancel callbacks — Stripe handles that on its hosted page and returns to `success_url`/`cancel_url`.
3. **Cancel / Downgrade buttons** → either:
   - **Portal:** one "Manage billing" button → `POST /api/subscription/portal` → redirect; or
   - keep the existing buttons wired to the slimmed cancel/downgrade routes.
4. **Return handling:** on `?success=true` show success + re-fetch `/api/subscription` (the webhook may land a beat later; poll once or show "updating…"). `?error=cancelled` shows a soft notice.
5. `pricing/page.tsx` — update any Geidea copy/links; the CTA just routes to checkout/sign-up.

---

## 9. Existing-subscriber cutover

Two paths depending on whether Geidea has live recurring subscribers:

- **Clean cutover (simplest):** stop new Geidea checkouts, let current Geidea cycles run out, and have users re-subscribe via Stripe (Portal/Checkout). Mark legacy subs and email them a re-subscribe link. No card data migration.
- **Card migration (only if needed):** Stripe supports importing payment methods via a data-migration request, but Geidea card tokens are **not** portable to Stripe. In practice you cannot move saved cards from Geidea → Stripe; plan for re-collection. Keep the old `geidea_*` columns until every legacy sub has either churned or re-subscribed, then drop them in a follow-up migration.

Given KSA + SAR, confirm your Stripe account is enabled for SAR and for the card networks (mada, Visa, Mastercard) your customers use. **mada** support in particular is worth verifying with Stripe before cutover.

---

## 10. Testing

- `stripe login` + `stripe listen --forward-to localhost:3000/api/subscription/webhook` → gives `whsec_...` for local `STRIPE_WEBHOOK_SECRET`.
- Test cards: `4242 4242 4242 4242` (success), `4000 0000 0000 0341` (attaches then fails on renewal), `4000 0000 0000 9995` (insufficient funds). Use `/stripe:test-cards` for the full set.
- Trigger events: `stripe trigger checkout.session.completed`, `invoice.payment_failed`, etc.
- Verify each flow in §11.
- `npm run typecheck` + `npm run lint` after the code changes.

---

## 11. End-to-end scenarios (the payment process)

1. **New subscribe:** Settings → choose plan/interval → `POST /checkout` → redirect to Stripe Checkout → pay → return `success_url` → `checkout.session.completed` + `customer.subscription.created` webhooks → row becomes `active` with `currentPeriodEnd`.
2. **Upgrade:** Portal plan-switch (or `/checkout` again) → `subscription.updated` with proration → plan + price updated immediately.
3. **Downgrade:** Portal (period-end switch) or `/downgrade` with `proration_behavior` → `subscription.updated` → new lower plan at next cycle.
4. **Cancel:** Portal or `/cancel` → `cancel_at_period_end=true` → access retained until `currentPeriodEnd` (your `getWorkspaceAccess` already honors this) → `subscription.deleted` at period end → `canceled`.
5. **Renewal success:** `invoice.paid` → `currentPeriodEnd` advances.
6. **Renewal failure:** `invoice.payment_failed` → `past_due` + renewal-failed email; Stripe dunning retries; cron is the safety net.
7. **Reactivate:** Portal removes scheduled cancel → `subscription.updated` → `active`.

`getWorkspaceAccess` in `src/lib/subscription/server.ts` needs **no logic change** — it already keys off `status`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `trialEndsAt`, which the webhook now feeds from Stripe.

---

## 12. Go-live checklist

- [ ] Live `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` set in Vercel.
- [ ] Live Products/Prices created; mapping stored in `platformSettings`.
- [ ] Webhook endpoint registered in Stripe dashboard → `/api/subscription/webhook`, subscribed to the §7 events.
- [ ] Customer Portal configured (allowed products, cancellation policy).
- [ ] SAR + mada/card networks confirmed enabled on the account.
- [ ] Restricted API key for server use; secret key never shipped client-side.
- [ ] Old `GEIDEA_*` env vars removed from Vercel.
- [ ] Migration applied; legacy `geidea_*` columns dropped after backfill window.
- [ ] Run through all §11 scenarios in test mode, then a live smoke test.

---

## 13. File change summary

| File | Action |
|---|---|
| `src/lib/geidea/client.ts`, `src/lib/geidea/types.ts` | **Delete** |
| `src/lib/stripe/client.ts` | **New** (SDK client + customer helper) |
| `scripts/stripe-bootstrap.ts` | **New** (one-time Product/Price creation) |
| `src/lib/db/schema.ts` | Swap geidea columns → stripe columns; drop `scheduledDowngradePlan` |
| `drizzle/00XX_stripe_billing.sql` | **New** migration (generated) |
| `src/lib/env.ts`, `.env.example` | Remove `GEIDEA_*`; add `STRIPE_*` |
| `src/lib/subscription/plans.ts`, `pricing.ts` | Remove Geidea config; add `getStripePriceId` |
| `src/app/api/subscription/checkout/route.ts` | Rewrite → Checkout Session |
| `src/app/api/subscription/webhook/route.ts` | Rewrite → Stripe signature + events |
| `src/app/api/subscription/callback/route.ts` | **Delete** |
| `src/app/api/subscription/cancel/route.ts` | Simplify → `cancel_at_period_end` (or delete for Portal) |
| `src/app/api/subscription/downgrade/route.ts` | Simplify → subscription update (or delete for Portal) |
| `src/app/api/subscription/portal/route.ts` | **New** (Customer Portal) |
| `src/app/api/subscription/route.ts` | Remove Geidea live fetch/cache |
| `src/app/api/cron/subscription-expiry/route.ts` | Trim downgrade-email half |
| `src/app/dashboard/settings/page.tsx` | Remove Geidea script/embed; redirect to Checkout/Portal |
| `src/app/pricing/page.tsx` | Copy/links cleanup |
| `src/lib/subscription/cache.ts` | Drop `geidea-sub:*` (or remove if unused) |
| `docs/geidea-*.md` | Archive/remove after cutover |
</content>
</invoke>
