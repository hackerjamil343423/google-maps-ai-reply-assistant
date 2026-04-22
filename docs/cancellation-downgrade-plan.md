# Cancellation & Downgrade — Implementation Plan

Source: StreamPay API docs (`https://docs.streampay.sa`) + OpenAPI spec.
Date: 2026-04-22

---

## Real StreamPay API Capabilities (confirmed from docs)

### What exists

| Endpoint | Method | What it does |
|---|---|---|
| `/api/v2/subscriptions` | GET | List subscriptions |
| `/api/v2/subscriptions` | POST | Create a subscription directly (not via payment link) |
| `/api/v2/subscriptions/{id}` | GET | Get full subscription details |
| `/api/v2/subscriptions/{id}` | PUT | Update limited fields only |
| `/api/v2/subscriptions/{id}/cancel` | POST | Cancel subscription (IMMEDIATE, no period-end option) |
| `/api/v2/subscriptions/{id}/freeze` | POST | Pause invoice generation for a date range |
| `/api/v2/subscriptions/{id}/freeze` | GET | List all freezes |
| `/api/v2/subscriptions/{id}/freeze/{freeze_id}` | PUT | Update a freeze |
| `/api/v2/subscriptions/{id}/freeze/{freeze_id}` | DELETE | Remove a freeze |

### What does NOT exist

- **No `cancel_at_period_end` option** — the cancel endpoint is always immediate.
- **No reactivate endpoint** — once canceled, there is no API to undo it.
- **No plan/product change** — the Update endpoint explicitly forbids changing the product. Quote: *"you will have to cancel and create a new subscription"* for plan changes.

### Cancel request body

```ts
POST /api/v2/subscriptions/{id}/cancel
{
  cancel_ongoing_invoices?: boolean  // false = keep current invoice, don't void/refund it
}
```

### Update allowed fields only

```ts
PUT /api/v2/subscriptions/{id}
{
  items?,             // subscription products (no product_id change allowed)
  coupons?,
  description?,
  auto_cancel_cycles?,  // after how many cycles to auto-cancel (useful — see below)
  payment_methods?
}
```

### SubscriptionDetailed response fields

```ts
{
  id: string (UUID)
  status: SubscriptionStatus
  organization_consumer_id: string
  items: [...]
  currency: string
  total_amount: string
  current_period_start: datetime | null
  current_period_end: datetime | null
  recurring_interval: string | null        // "month" | "year" etc.
  recurring_interval_count: number | null
  auto_cancel_cycles: number | null        // cycles before auto-cancel
  latest_invoice: InvoiceDetailed | null
  payment_methods: PaymentMethodDto | null
  created_at: datetime
  updated_at: datetime | null
}
```

### Freeze request body

```ts
POST /api/v2/subscriptions/{id}/freeze
{
  freeze_start_datetime: datetime  // required
  freeze_end_datetime?: datetime   // optional — if omitted, freeze is indefinite
  notes?: string
}
```
Freeze pauses invoice generation. Subscription auto-resumes when `freeze_end_datetime` passes.

---

## Key Design Decisions (driven by API limits)

### Cancel at period end — no native support in StreamPay

Since there is no `cancel_at_period_end` flag, we implement it ourselves:

1. User clicks "Cancel subscription"
2. Call StreamPay cancel immediately → StreamPay fires `SUBSCRIPTION_CANCELED` webhook
3. Webhook handler sets `status = "canceled"` in DB as it does today
4. **Modify `server.ts`**: allow access when `status = "canceled"` BUT `currentPeriodEnd` is still in the future
5. User keeps access until `currentPeriodEnd` expires — no further charges possible since StreamPay subscription is gone

This is the correct pattern. The user paid for the period; we honor that via our own `currentPeriodEnd` check.

### Downgrade — no plan change in StreamPay

Downgrade means: **cancel current subscription + start a new cheaper one.**

1. Call StreamPay cancel immediately (`cancel_ongoing_invoices: false`)
2. Store `scheduledDowngradePlan` in DB
3. Webhook `SUBSCRIPTION_CANCELED` fires → handler sends email to user with a fresh checkout link for the lower plan, noting "your access continues until [currentPeriodEnd]"
4. User clicks the link, pays for the new plan → normal checkout callback activates it
5. With modified `server.ts`, user retains access on the old plan until `currentPeriodEnd`, even if they subscribe to the new plan in the meantime (the new subscription simply becomes active, overwriting the canceled status)

### Reactivation — no StreamPay API, do it via new checkout

If a user cancels and changes their mind (while `currentPeriodEnd` is still in the future):
- "Reactivate" button → goes to checkout for the same plan
- User pays for a new month, gets a new `streamSubscriptionId`
- On payment callback, `status` flips to `"active"` → access continues normally

There is no "undo cancel" in StreamPay. New subscription = new payment.

---

## Database Migration (Step 1)

**File:** `src/lib/db/schema.ts`

Add to the `subscriptions` table:

```ts
cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
scheduledDowngradePlan: text("scheduled_downgrade_plan"),
```

`cancelAtPeriodEnd` is only for UI display (banners, buttons). The actual access control uses `status = "canceled"` + `currentPeriodEnd` check in `server.ts`.

```bash
npm run db:generate
npm run db:push
```

---

## Step 2 — StreamPay Client: Add Cancel & Get Subscription

**File:** `src/lib/streampay/client.ts`

```ts
/**
 * Cancel a StreamPay subscription immediately.
 * Pass cancel_ongoing_invoices: false to preserve the current paid invoice.
 * StreamPay will fire SUBSCRIPTION_CANCELED webhook.
 */
export async function cancelSubscription(
  subscriptionId: string,
  options: { cancelOngoingInvoices?: boolean } = {}
): Promise<void> {
  const res = await fetch(`${STREAM_BASE}/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ cancel_ongoing_invoices: options.cancelOngoingInvoices ?? false }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`StreamPay cancelSubscription failed: ${res.status} ${text}`);
  }
}

export type StreamSubscription = {
  id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  recurring_interval: string | null;
  recurring_interval_count: number | null;
  auto_cancel_cycles: number | null;
  organization_consumer_id: string;
};

/**
 * Get full subscription details from StreamPay.
 * Used to verify subscription state before making mutations.
 */
export async function getSubscription(subscriptionId: string): Promise<StreamSubscription> {
  const res = await fetch(`${STREAM_BASE}/subscriptions/${subscriptionId}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`StreamPay getSubscription failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<StreamSubscription>;
}
```

---

## Step 3 — Modify `server.ts` Access Control

**File:** `src/lib/subscription/server.ts`

Update the `canceled` status block to allow access during the paid period:

```ts
// BEFORE (current code):
if (status === "canceled") {
  return { allowed: false, reason: "canceled", plan, planInfo, status };
}

// AFTER:
if (status === "canceled") {
  // If canceled but still within the paid period, honor it
  const withinPaidPeriod = sub.currentPeriodEnd != null && sub.currentPeriodEnd > new Date();
  if (withinPaidPeriod) {
    // User canceled but keeps access until their period ends
    return { allowed: true, plan, planInfo, status };
  }
  return { allowed: false, reason: "canceled", plan, planInfo, status };
}
```

This is the core change that makes "cancel at period end" work without any StreamPay support for it.

---

## Step 4 — New API Route: Cancel Subscription

**New file:** `src/app/api/subscription/cancel/route.ts`

```
POST /api/subscription/cancel
Body: {} (no body needed)
```

Logic:
1. Auth check → get session
2. Load subscription from DB
3. Guard: `status` must be `"active"` or `"past_due"` — cannot cancel what's already canceled/trialing
4. Guard: must have `streamSubscriptionId` in DB — if missing, no StreamPay subscription to cancel
5. Guard: if `cancelAtPeriodEnd` is already `true` → return 200 `{ alreadyScheduled: true }` (idempotent)
6. Call `cancelSubscription(streamSubscriptionId, { cancelOngoingInvoices: false })`
   - If this throws → return 502, do NOT update DB
7. Set `cancelAtPeriodEnd = true` in DB (webhook will set `status = "canceled"` shortly after)
8. Send "cancellation scheduled" email
9. Return `{ success: true, accessUntil: sub.currentPeriodEnd }`

---

## Step 5 — New API Route: Downgrade Plan

**New file:** `src/app/api/subscription/downgrade/route.ts`

```
POST /api/subscription/downgrade
Body: { targetPlan: "Local Business" | "Multi-Location" }
```

Logic:
1. Auth check
2. Validate `targetPlan` is a known paid plan (not "free")
3. Load subscription from DB
4. Guard: `status` must be `"active"` — cannot downgrade a canceled/trialing subscription
5. Guard: `cancelAtPeriodEnd` must be `false` — no stacking
6. Guard: target plan must be strictly lower than current plan

   ```ts
   const PLAN_RANK: Record<string, number> = {
     free: 0,
     "Local Business": 1,
     "Multi-Location": 2,
     "Agency Max": 3,
   };
   if (PLAN_RANK[targetPlan] >= PLAN_RANK[sub.plan]) {
     return 400 "Target plan is not lower than current plan";
   }
   ```

7. Account limit check: count active `businesses` for workspace. If count > `PLAN_LIMITS[targetPlan].maxAccounts`:
   - Include `{ warning: "You have X connected profiles. The [plan] plan allows Y. You'll need to disconnect Z profile(s)." }` in the response
   - Do NOT block — return the warning alongside success and let the UI show a confirmation dialog
   - The front-end should show the warning and require a "I understand" confirmation before calling this route with `{ confirmed: true }`

8. Call `cancelSubscription(streamSubscriptionId, { cancelOngoingInvoices: false })`
   - If throws → return 502, do NOT update DB

9. Update DB:
   ```ts
   await db.update(subscriptions).set({
     cancelAtPeriodEnd: true,
     scheduledDowngradePlan: targetPlan,
     updatedAt: new Date(),
   }).where(eq(subscriptions.workspaceId, workspaceId));
   ```

10. StreamPay will fire `SUBSCRIPTION_CANCELED` webhook — the handler (Step 6b) will send the downgrade email

11. Return `{ success: true, downgradeTo: targetPlan, accessUntil: sub.currentPeriodEnd, warning?: string }`

---

## Step 6 — Update Webhook Handler

**File:** `src/app/api/subscription/webhook/route.ts`

### 6a — `SUBSCRIPTION_CANCEL_AT_PERIOD_END`: upgrade from log-only to DB update

Add to the switch:
```ts
case "SUBSCRIPTION_CANCEL_AT_PERIOD_END":
  await handleCancelAtPeriodEnd(entity_id);
  break;
```

Add handler (safety net in case the API route couldn't update DB):
```ts
async function handleCancelAtPeriodEnd(streamSubscriptionId: string) {
  if (!db) return;
  const sub = await db.query.subscriptions.findFirst({
    where: eq(dbSchema.subscriptions.streamSubscriptionId, streamSubscriptionId),
  });
  if (!sub) return;

  await db.update(dbSchema.subscriptions)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(eq(dbSchema.subscriptions.workspaceId, sub.workspaceId));

  console.log(`[webhook] cancel-at-period-end confirmed for workspace ${sub.workspaceId}`);
}
```

### 6b — `SUBSCRIPTION_CANCELED`: add downgrade email + keep currentPeriodEnd

Update `handleSubscriptionCanceled` to also check `scheduledDowngradePlan`. Replace the current simple version with:

```ts
async function handleSubscriptionCanceled(streamSubscriptionId: string) {
  if (!db) return;

  const result = await db
    .select({
      workspaceId: dbSchema.subscriptions.workspaceId,
      plan: dbSchema.subscriptions.plan,
      currentPeriodEnd: dbSchema.subscriptions.currentPeriodEnd,
      scheduledDowngradePlan: dbSchema.subscriptions.scheduledDowngradePlan,
      workspaceName: dbSchema.workspaces.name,
      ownerEmail: dbSchema.user.email,
      ownerName: dbSchema.user.name,
    })
    .from(dbSchema.subscriptions)
    .innerJoin(dbSchema.workspaces, eq(dbSchema.workspaces.id, dbSchema.subscriptions.workspaceId))
    .innerJoin(dbSchema.user, eq(dbSchema.user.id, dbSchema.workspaces.ownerUserId))
    .where(eq(dbSchema.subscriptions.streamSubscriptionId, streamSubscriptionId))
    .limit(1);

  const row = result[0];
  if (!row) return;

  // Mark as canceled. Keep currentPeriodEnd intact so server.ts access
  // control can still allow access during the remaining paid period.
  await db.update(dbSchema.subscriptions)
    .set({
      status: "canceled",
      // Do NOT clear currentPeriodEnd — server.ts uses it to allow access
      // until the period expires even after cancellation.
      cancelAtPeriodEnd: false,   // clear flag now that it's actually canceled
      scheduledDowngradePlan: null,
      updatedAt: new Date(),
    })
    .where(eq(dbSchema.subscriptions.workspaceId, row.workspaceId));

  // If a downgrade was scheduled, email the user with a new checkout link
  if (row.scheduledDowngradePlan) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    // Deep link that will auto-trigger checkout for the lower plan (see Step 10)
    const checkoutUrl = `${appUrl}/dashboard/settings?section=billing&autoCheckout=${encodeURIComponent(row.scheduledDowngradePlan)}`;

    try {
      await sendDowngradeReadyEmail({
        toEmail: row.ownerEmail,
        name: row.ownerName ?? row.ownerEmail,
        workspaceName: row.workspaceName,
        fromPlan: row.plan,
        toPlan: row.scheduledDowngradePlan,
        accessUntil: row.currentPeriodEnd,
        checkoutUrl,
      });
    } catch (err) {
      console.error("[webhook] failed to send downgrade ready email:", err);
    }

    console.log(`[webhook] downgrade triggered from ${row.plan} to ${row.scheduledDowngradePlan} for workspace ${row.workspaceId}`);
  }

  console.log(`[webhook] canceled subscription for workspace ${row.workspaceId}`);
}
```

---

## Step 7 — Update `GET /api/subscription`

**File:** `src/app/api/subscription/route.ts`

Add to the return object:
```ts
cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
scheduledDowngradePlan: subscription?.scheduledDowngradePlan ?? null,
```

The UI needs these to know which banners and buttons to render.

---

## Step 8 — Email Templates

**File:** `src/lib/email-templates.ts` and `src/lib/emails.ts`

### Template: Cancellation Scheduled

Subject: `Your [plan] subscription will end on [date]`

Body:
```
Hi [name],

Your [plan] subscription has been cancelled. You'll keep full access until [date].

After that date, you'll lose access to AI reply generation and Google review management.

Changed your mind? You can re-subscribe anytime from your billing settings.

[Go to billing settings] → /dashboard/settings?section=billing
```

Add to `emails.ts`:
```ts
export async function sendCancellationScheduledEmail(data: {
  toEmail: string;
  name: string;
  workspaceName: string;
  plan: string;
  accessUntil: Date | null;
}) { ... }
```

### Template: Downgrade Ready

Subject: `Your [new plan] subscription is ready to activate`

Body:
```
Hi [name],

Your [old plan] subscription has been cancelled. You still have access until [date].

To continue using Five Star Reply on the [new plan] plan, complete your new subscription below.

[Activate [new plan]] → /dashboard/settings?section=billing&autoCheckout=[plan]
```

Add to `emails.ts`:
```ts
export async function sendDowngradeReadyEmail(data: {
  toEmail: string;
  name: string;
  workspaceName: string;
  fromPlan: string;
  toPlan: string;
  accessUntil: Date | null;
  checkoutUrl: string;
}) { ... }
```

---

## Step 9 — Billing UI

**File:** `src/app/dashboard/settings/page.tsx` (billing section ~line 1399)

### 9a — Extend SubscriptionState type

```ts
type SubscriptionState = {
  // existing...
  cancelAtPeriodEnd: boolean;
  scheduledDowngradePlan: string | null;
};

const FALLBACK_SUBSCRIPTION: SubscriptionState = {
  // existing...
  cancelAtPeriodEnd: false,
  scheduledDowngradePlan: null,
};
```

### 9b — "Cancels on [date]" banner

Show when `cancelAtPeriodEnd = true` and `scheduledDowngradePlan = null`:

```tsx
{subscription.cancelAtPeriodEnd && !subscription.scheduledDowngradePlan && (
  <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-semibold text-orange-700">
        Subscription cancels on {subscription.nextBillingAt}
      </p>
      <p className="text-xs text-orange-600 mt-0.5">
        Full access continues until then. You can re-subscribe any time.
      </p>
    </div>
    <button
      onClick={() => startUpgrade(subscription.plan)}
      className="text-sm font-medium text-orange-700 underline shrink-0"
    >
      Re-subscribe
    </button>
  </div>
)}
```

"Re-subscribe" just calls the existing `startUpgrade` with the same plan — goes through normal checkout.

### 9c — "Downgrade scheduled" banner

Show when `scheduledDowngradePlan !== null`:

```tsx
{subscription.scheduledDowngradePlan && (
  <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
    <p className="text-sm font-semibold text-yellow-800">
      Downgrading to {subscription.scheduledDowngradePlan} on {subscription.nextBillingAt}
    </p>
    <p className="text-xs text-yellow-700 mt-0.5">
      You'll receive an email when your current period ends to complete your new subscription.
    </p>
  </div>
)}
```

### 9d — "Cancel subscription" link on current plan card

Only show when:
- `status === "active"` or `status === "past_due"`
- `cancelAtPeriodEnd === false`
- `scheduledDowngradePlan === null`

```tsx
{(subscription.status === "active" || subscription.status === "past_due")
  && !subscription.cancelAtPeriodEnd
  && !subscription.scheduledDowngradePlan && (
  <button
    onClick={() => setShowCancelDialog(true)}
    className="mt-3 text-xs text-red-500 hover:underline"
  >
    Cancel subscription
  </button>
)}
```

### 9e — Cancel confirmation dialog state + handler

Add state: `const [showCancelDialog, setShowCancelDialog] = useState(false);`

Dialog content:
```
Title: "Cancel your subscription?"
Body: "You'll keep full access to [plan] until [nextBillingAt].
After that, AI reply generation and Google Business management will be disabled."
Buttons: [Keep subscription] [Cancel at period end]
```

Handler:
```ts
async function handleConfirmCancel() {
  const res = await fetch("/api/subscription/cancel", { method: "POST" });
  const json = await res.json();
  if (res.ok) {
    setSubscription((s) => ({ ...s, cancelAtPeriodEnd: true }));
    setBillingNotice(`Subscription will end on ${subscription.nextBillingAt}.`);
    setShowCancelDialog(false);
  } else {
    setBillingError(json.error ?? "Failed to cancel. Please try again.");
  }
}
```

### 9f — "Downgrade" button on lower plan cards

In the plan cards loop, detect downgrade vs upgrade:

```ts
const PLAN_RANK: Record<string, number> = {
  free: 0, "Local Business": 1, "Multi-Location": 2, "Agency Max": 3,
};
const isDowngrade = !isCurrent
  && PLAN_RANK[plan.name] < PLAN_RANK[subscription.plan]
  && subscription.status === "active";
```

Update the button:
```tsx
<button
  onClick={() => isDowngrade ? handleDowngradeClick(plan.name) : startUpgrade(plan.name)}
  disabled={isCurrent || !!upgrading || subscription.cancelAtPeriodEnd}
>
  {isCurrent ? "Current plan" : isDowngrade ? "Downgrade" : "Upgrade"}
</button>
```

### 9g — Downgrade preview + confirmation dialog

Add state: `const [downgradeTarget, setDowngradeTarget] = useState<string | null>(null);`
Add state: `const [downgradeWarning, setDowngradeWarning] = useState<string | null>(null);`
Add state: `const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);`

`handleDowngradeClick`:
```ts
async function handleDowngradeClick(targetPlan: string) {
  // First, get the account warning (if any) before showing dialog
  const count = googleStatus.connectedAccounts ?? 0;
  const newMax = PLAN_LIMITS[targetPlan]?.maxAccounts ?? 1;
  const warning = count > newMax
    ? `You have ${count} connected profiles. ${targetPlan} allows ${newMax}. You'll need to disconnect ${count - newMax} profile(s).`
    : null;

  setDowngradeTarget(targetPlan);
  setDowngradeWarning(warning);
  setShowDowngradeDialog(true);
}
```

Dialog content:
```
Title: "Downgrade to [targetPlan]?"
Body: "Your [current plan] access continues until [nextBillingAt].
After that, you'll receive an email to set up your [targetPlan] subscription."
[if warning]: "⚠ [warning text]"
Buttons: [Keep current plan] [Schedule downgrade]
```

`handleConfirmDowngrade`:
```ts
async function handleConfirmDowngrade() {
  const res = await fetch("/api/subscription/downgrade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetPlan: downgradeTarget }),
  });
  const json = await res.json();
  if (res.ok) {
    setSubscription((s) => ({
      ...s,
      cancelAtPeriodEnd: true,
      scheduledDowngradePlan: downgradeTarget,
    }));
    setBillingNotice(`Downgrade to ${downgradeTarget} scheduled for ${subscription.nextBillingAt}.`);
    setShowDowngradeDialog(false);
  } else {
    setBillingError(json.error ?? "Failed to schedule downgrade. Please try again.");
  }
}
```

---

## Step 10 — Auto-Checkout Deep Link

The downgrade email links to:
```
/dashboard/settings?section=billing&autoCheckout=Local+Business
```

In `settings/page.tsx`, add to the initial `useEffect` that already handles `?success=true` and `?error=payment_failed`:

```ts
const autoCheckout = searchParams.get("autoCheckout");
if (autoCheckout && isKnownPlan(autoCheckout) && autoCheckout !== "free") {
  // Wait for subscription data to load, then auto-trigger checkout
  // Use a short delay to ensure the billing section is rendered
  setTimeout(() => startUpgrade(autoCheckout), 300);
}
```

This lets the user click the email link and land directly into the checkout flow without having to find the plan card manually.

---

## Implementation Order

| Step | File | Notes |
|------|------|-------|
| **1. DB migration** | `schema.ts` → `db:generate` → `db:push` | Do first, everything else depends on new columns |
| **2. StreamPay client** | `src/lib/streampay/client.ts` | Add `cancelSubscription` and `getSubscription` |
| **3. Modify server.ts** | `src/lib/subscription/server.ts` | Allow "canceled" + `currentPeriodEnd > now` → `allowed: true` |
| **4. Cancel route** | `src/app/api/subscription/cancel/route.ts` | New file |
| **5. Downgrade route** | `src/app/api/subscription/downgrade/route.ts` | New file |
| **6a. Webhook CANCEL_AT_PERIOD_END** | `src/app/api/subscription/webhook/route.ts` | Upgrade from log-only |
| **6b. Webhook SUBSCRIPTION_CANCELED** | same file | Add downgrade email branch |
| **7. Subscription GET** | `src/app/api/subscription/route.ts` | Return new fields |
| **8. Email templates** | `src/lib/email-templates.ts` + `emails.ts` | Two new templates |
| **9. Billing UI** | `src/app/dashboard/settings/page.tsx` | Banners, buttons, dialogs |
| **10. Auto-checkout** | same file | Deep link from downgrade email |

---

## Out of Scope

- **Freeze subscription** — the Freeze API could support "pause billing while traveling" feature but is not related to cancellation or downgrade. Left for a future feature.
- **Immediate cancel with refund** — StreamPay has no refund API. Not planned.
- **Team seat limits on downgrade** — separate feature gap, separate plan needed.
- **Force-disconnect excess accounts** — warn only; user disconnects manually.
