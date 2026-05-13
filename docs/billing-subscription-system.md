# Billing and Subscription System

The app uses Geidea for KSA billing in SAR. Checkout creates a Geidea subscription, opens the hosted payment page modal with a session ID, and relies on Geidea subscription callbacks for first payments, renewals, failures, and cancellations.

## Gateway

- Provider: Geidea
- API base: `https://api.ksamerchant.geidea.net`
- HPP script: `https://www.ksamerchant.geidea.net/hpp/geideaCheckout.min.js`
- Auth: HTTP Basic Auth using `GEIDEA_MERCHANT_PUBLIC_KEY:GEIDEA_API_PASSWORD`
- Signature: HMAC-SHA256 using the Geidea API password, Base64 encoded

## Local Schema

The `subscriptions` table stores:

| Column | Purpose |
|---|---|
| `geideaCustomerId` | Geidea customer identifier when returned by the API |
| `geideaSubscriptionId` | Geidea recurring subscription identifier |
| `geideaAgreementId` | Card-on-file agreement ID from payment callbacks |
| `geideaTokenId` | Stored card token ID from payment callbacks |
| `billingInterval` | `monthly` or `yearly` |
| `currentPeriodEnd` | Local access boundary, based on Geidea `nextOccurrenceDate` |
| `cancelAtPeriodEnd` | Local soft-cancel flag for UX/access control |
| `scheduledDowngradePlan` | Pending downgrade target after the paid period ends |

## Checkout Flow

1. `POST /api/subscription/checkout` validates the authenticated user, plan, and billing interval.
2. The route ensures a workspace and local subscription row exist.
3. It creates a Geidea subscription with the plan amount and cycle config.
4. It stores `geideaSubscriptionId` and any returned `geideaCustomerId`.
5. It creates a Geidea subscription checkout session.
6. It returns `{ "sessionId": "..." }`.
7. The frontend opens the HPP modal with `new GeideaCheckout(...).startPayment(sessionId)`.

## Callback Flow

`POST /api/subscription/webhook` and `POST /api/subscription/callback` both process Geidea callback payloads.

- Paid callbacks set `status: "active"`, store agreement/token IDs, and update `currentPeriodEnd` from `nextOccurrenceDate`.
- Failed recurring callbacks set `status: "past_due"` and send the renewal failed email.
- Cancelled subscription callbacks set `status: "canceled"` while preserving `currentPeriodEnd` for access until the paid period ends.

## Cancellation and Downgrade

Cancel and downgrade both call Geidea cancellation to stop future charges. The app keeps the existing soft-cancel UX by setting `cancelAtPeriodEnd: true` and allowing access until `currentPeriodEnd`.

Downgrades store `scheduledDowngradePlan`; the subscription expiry cron emails the owner after the paid period ends with a billing page link that auto-launches checkout for the lower plan.

## Environment

```env
GEIDEA_MERCHANT_PUBLIC_KEY=
GEIDEA_API_PASSWORD=
GEIDEA_CALLBACK_SECRET=
NEXT_PUBLIC_APP_URL=
```

## Verification

Run:

```bash
npm run lint
npm run typecheck
```

Then test checkout from the billing page, confirm the Geidea modal opens with the expected SAR amount, and verify callbacks update the subscription row.
