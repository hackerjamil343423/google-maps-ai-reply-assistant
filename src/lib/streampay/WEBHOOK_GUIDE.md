# StreamPay Webhook Guide

Reference for implementing and maintaining the StreamPay webhook handler in this app.
Source: https://docs.streampay.sa/webhooks

---

## Setup

1. Go to **StreamPay Dashboard > Settings > Webhooks**
2. Register your endpoint: `https://<your-domain>/api/subscription/webhook`
3. Subscribe to these events (minimum required):
   - `INVOICE_COMPLETED` - subscription renewal confirmed
   - `SUBSCRIPTION_CANCELED` - user canceled subscription
   - `SUBSCRIPTION_CYCLE_RENEWAL_FAILED` - renewal payment failed
   - `SUBSCRIPTION_INACTIVATED` - subscription deactivated
   - `PAYMENT_FAILED` - individual payment failed
4. Copy the **secret_key** shown after creation; store it as `STREAM_WEBHOOK_SECRET` in your `.env`

---

## Incoming Request Format

StreamPay sends a `POST` request with these headers:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `User-Agent` | `StreamApp-Webhook/1.0` |
| `X-Webhook-Event` | e.g. `PAYMENT_SUCCEEDED` |
| `X-Webhook-Entity-Type` | e.g. `PAYMENT` |
| `X-Webhook-Entity-ID` | UUID of the entity |
| `X-Webhook-Signature` | `t={unix_timestamp},v1={hmac_sha256}` |
| `X-Webhook-Timestamp` | Same timestamp used in the signature |

### Body Schema

```ts
type StreamWebhookPayload = {
  event_type: string;        // e.g. "INVOICE_COMPLETED"
  entity_type: string;       // e.g. "INVOICE"
  entity_id: string;         // UUID
  entity_url: string;        // Full API URL to fetch the entity
  status: string;            // Entity status at time of event
  timestamp: string;         // ISO 8601
  data: {
    invoice?: { id: string; url: string };
    payment?: { id: string; url: string };
    payment_link?: { id: string; url: string };
    metadata?: Record<string, unknown>; // custom_metadata you set at checkout
  };
};
```

### Real Payload Example

```json
{
  "event_type": "PAYMENT_SUCCEEDED",
  "entity_type": "PAYMENT",
  "entity_id": "e2182d3d-b4cf-4972-bcc0-ec6d963c066d",
  "entity_url": "https://stream-app-service.streampay.sa/api/v2/payments/e2182d3d-b4cf-4972-bcc0-ec6d963c066d",
  "status": "SUCCEEDED",
  "timestamp": "2025-07-22T14:40:31.485576",
  "data": {
    "invoice": {
      "id": "2df0f7e0-2634-46ab-829a-bfcb0a797d87",
      "url": "https://stream-app-service.streampay.sa/api/v2/invoices/2df0f7e0-2634-46ab-829a-bfcb0a797d87"
    },
    "payment": {
      "id": "e2182d3d-b4cf-4972-bcc0-ec6d963c066d",
      "url": "https://stream-app-service.streampay.sa/api/v2/payments/e2182d3d-b4cf-4972-bcc0-ec6d963c066d"
    },
    "payment_link": {
      "id": "6361941e-3a81-4aa5-aaa6-60d6e052883a",
      "url": "https://stream-app-service.streampay.sa/api/v2/payment_links/6361941e-3a81-4aa5-aaa6-60d6e052883a"
    },
    "metadata": {
      "workspaceId": "ws_abc123",
      "plan": "Local Business"
    }
  }
}
```

---

## Signature Verification (TypeScript)

**You must verify every webhook before processing it.** Use the raw request body; do NOT parse JSON first.

```ts
import crypto from "crypto";

/**
 * Verifies the X-Webhook-Signature header from StreamPay.
 *
 * @param secret       STREAM_WEBHOOK_SECRET env variable
 * @param rawBody      Buffer of the raw request body (before JSON.parse)
 * @param sigHeader    Value of X-Webhook-Signature header
 *                     Format: "t=1721654431,v1=abc123..."
 * @returns true if valid, false if tampered or missing
 */
export function verifyStreamPaySignature(
  secret: string,
  rawBody: Buffer,
  sigHeader: string
): boolean {
  try {
    const parts = Object.fromEntries(
      sigHeader.split(",").map((p) => p.split("=") as [string, string])
    );
    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return false;

    const message = `${timestamp}.${rawBody.toString("utf-8")}`;
    const computed = crypto
      .createHmac("sha256", secret)
      .update(message)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}
```

> **Important:** Always use `crypto.timingSafeEqual`, never `===`, to prevent timing attacks.

---

## Event Handling Map

### Events that matter for our subscription system

| Event | What it means | Our action |
|-------|--------------|------------|
| `INVOICE_COMPLETED` with `subscription_id` | Subscription cycle renewed successfully | Extend `currentPeriodEnd` by 30 days (or 365 for yearly), keep status `active` |
| `INVOICE_COMPLETED` without `subscription_id` | First payment completed | Already handled by redirect callback; can ignore or use as fallback |
| `SUBSCRIPTION_CANCELED` | User or admin canceled the subscription | Set `status = "canceled"` |
| `SUBSCRIPTION_CANCEL_AT_PERIOD_END` | Scheduled to cancel at end of current period | Store cancellation intent, show notice in UI |
| `SUBSCRIPTION_CYCLE_RENEWAL_FAILED` | Renewal payment failed | Set `status = "past_due"`, send email to user |
| `SUBSCRIPTION_INACTIVATED` | Subscription deactivated by StreamPay | Set `status = "past_due"` or `"canceled"` |
| `SUBSCRIPTION_FROZEN` | Subscription frozen | Set `status = "past_due"` |
| `PAYMENT_FAILED` | Individual payment failed | Log, optionally notify user |

### Subscription Renewal Flow (what StreamPay sends)

```
1. INVOICE_CREATED      -> new billing cycle starts
2. PAYMENT_SUCCEEDED    -> payment collected
3. INVOICE_COMPLETED    -> invoice done (has subscription_id) -> handle this one
```

How to detect a renewal in `INVOICE_COMPLETED`:
- Fetch the invoice from `entity_url`
- If `invoice.subcription_id` (note: StreamPay API spells it this way) is not null, it is a renewal
- Cross-reference `streamSubscriptionId` in our DB to find the workspace

---

## How to Identify the Workspace

The webhook payload does **not** directly include our `workspaceId`. Use this lookup chain:

1. **From `INVOICE_COMPLETED`**: fetch the invoice, get `subcription_id`, then look up `subscriptions.streamSubscriptionId` in our DB
2. **From `SUBSCRIPTION_*` events**: the `entity_id` is the StreamPay subscription ID, so look up `subscriptions.streamSubscriptionId`
3. **Fallback**: the `data.metadata` object may contain `workspaceId` if it was set in `custom_metadata` at checkout

---

## Delivery & Retry Logic

StreamPay retries up to **5 times** if your endpoint doesn't return `2xx`:

| Attempt | Delay after previous failure |
|---------|------------------------------|
| 1st retry | 5 minutes |
| 2nd retry | 30 minutes |
| 3rd retry | 2 hours |
| 4th retry | 6 hours |
| 5th retry | 12 hours |

After the 5th failure the delivery is permanently marked as failed; no more retries.

**Best practice:** Return `200` immediately, then process asynchronously (or process synchronously and return `200` only after DB write succeeds). Do **not** do slow external API calls before responding.

---

## Checklist Before Going Live

- [ ] `STREAM_WEBHOOK_SECRET` added to production environment variables
- [ ] Endpoint URL registered in StreamPay dashboard
- [ ] All 5 critical event types subscribed (see Setup section above)
- [ ] Signature verification implemented and tested
- [ ] Idempotency handled: same `entity_id` delivered twice should not double-extend the period
- [ ] Webhook handler returns `200` within a few seconds
- [ ] Renewal logic tested: `INVOICE_COMPLETED` with `subscription_id` extends `currentPeriodEnd`
- [ ] Cancellation logic tested: `SUBSCRIPTION_CANCELED` sets status to `"canceled"`
- [ ] Renewal failure tested: `SUBSCRIPTION_CYCLE_RENEWAL_FAILED` sets status to `"past_due"`

---

## Known API Quirk

The StreamPay API returns `subcription_id` (missing the `s`) on invoice objects; this is a typo in their API. Our `StreamInvoice` type in `client.ts` matches this spelling intentionally. Do not "fix" it.
