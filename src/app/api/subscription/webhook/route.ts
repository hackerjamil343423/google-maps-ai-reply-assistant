import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { db, dbSchema } from "@/lib/db";
import { sendRenewalFailedEmail } from "@/lib/emails";
import { stripe } from "@/lib/stripe/client";
import { isKnownPlan } from "@/lib/subscription/plans";
import { PAID_PLAN_NAMES } from "@/lib/subscription/pricing";

// Required so Next.js does not parse the body — Stripe needs the raw bytes to
// verify the signature.
export const dynamic = "force-dynamic";

const PLAN_BY_PRICE = new Map<string, string>();

/** Lazily build the price→plan reverse map from the DB on first use. */
async function getPlanForPriceId(priceId: string): Promise<string | null> {
  if (PLAN_BY_PRICE.has(priceId)) return PLAN_BY_PRICE.get(priceId)!;

  if (!db) return null;

  const [setting] = await db
    .select({ value: dbSchema.platformSettings.value })
    .from(dbSchema.platformSettings)
    .where(eq(dbSchema.platformSettings.key, "billing.stripe_price_ids.v1"))
    .limit(1)
    .catch(() => []);

  if (!setting?.value) return null;

  try {
    const parsed = JSON.parse(setting.value) as Record<
      string,
      { monthly: string; yearly: string }
    >;
    for (const plan of PAID_PLAN_NAMES) {
      const entry = parsed[plan];
      if (entry) {
        PLAN_BY_PRICE.set(entry.monthly, plan);
        PLAN_BY_PRICE.set(entry.yearly, plan);
      }
    }
  } catch {
    return null;
  }

  return PLAN_BY_PRICE.get(priceId) ?? null;
}

function mapStripeStatus(
  status: Stripe.Subscription["status"]
): "trialing" | "active" | "past_due" | "canceled" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      return "canceled";
  }
}

async function handleSubscriptionUpsert(
  subscription: Stripe.Subscription,
  workspaceIdHint?: string | null
) {
  if (!db) return;

  const stripeSubId = subscription.id;
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const priceItem = subscription.items.data[0];
  const priceId = priceItem?.price.id ?? null;
  const interval = priceItem?.price.recurring?.interval;
  const billingInterval: "monthly" | "yearly" =
    interval === "year" ? "yearly" : "monthly";

  const planName = priceId ? await getPlanForPriceId(priceId) : null;
  const plan =
    planName && isKnownPlan(planName) && planName !== "free"
      ? planName
      : subscription.metadata?.plan ?? null;

  // In the 2026 Stripe API, current_period_end moved to SubscriptionItem.
  const periodEndTs = priceItem?.current_period_end;
  const currentPeriodEnd = periodEndTs
    ? new Date(periodEndTs * 1000)
    : new Date(Date.now() + (billingInterval === "yearly" ? 365 : 30) * 86400 * 1000);
  const status = mapStripeStatus(subscription.status);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  // Look up the subscription row
  let sub = await db.query.subscriptions.findFirst({
    where: eq(dbSchema.subscriptions.stripeSubscriptionId, stripeSubId),
  });

  // Fall back to customer ID or workspace hint
  if (!sub && stripeCustomerId) {
    sub = await db.query.subscriptions.findFirst({
      where: eq(dbSchema.subscriptions.stripeCustomerId, stripeCustomerId),
    });
  }

  if (!sub && workspaceIdHint) {
    sub = await db.query.subscriptions.findFirst({
      where: eq(dbSchema.subscriptions.workspaceId, workspaceIdHint),
    });
  }

  if (!sub) {
    console.warn(`[stripe] no subscription row found for ${stripeSubId}`);
    return;
  }

  await db
    .update(dbSchema.subscriptions)
    .set({
      stripeSubscriptionId: stripeSubId,
      stripeCustomerId,
      stripePriceId: priceId,
      status,
      plan: plan ?? sub.plan,
      billingInterval,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      ...(trialEnd ? { trialEndsAt: trialEnd } : {}),
      updatedAt: new Date(),
    })
    .where(eq(dbSchema.subscriptions.workspaceId, sub.workspaceId));
}

async function sendFailureEmail(stripeSubId: string) {
  if (!db) return;

  const sub = await db.query.subscriptions.findFirst({
    where: eq(dbSchema.subscriptions.stripeSubscriptionId, stripeSubId),
  });
  if (!sub) return;

  const result = await db
    .select({
      plan: dbSchema.subscriptions.plan,
      workspaceName: dbSchema.workspaces.name,
      ownerEmail: dbSchema.user.email,
      ownerName: dbSchema.user.name,
      ownerLanguage: dbSchema.userProfiles.language,
    })
    .from(dbSchema.subscriptions)
    .innerJoin(
      dbSchema.workspaces,
      eq(dbSchema.workspaces.id, dbSchema.subscriptions.workspaceId)
    )
    .innerJoin(dbSchema.user, eq(dbSchema.user.id, dbSchema.workspaces.ownerUserId))
    .leftJoin(
      dbSchema.userProfiles,
      eq(dbSchema.userProfiles.userId, dbSchema.workspaces.ownerUserId)
    )
    .where(eq(dbSchema.subscriptions.workspaceId, sub.workspaceId))
    .limit(1);

  const row = result[0];
  if (!row) return;

  await sendRenewalFailedEmail({
    toEmail: row.ownerEmail,
    name: row.ownerName ?? row.ownerEmail,
    workspaceName: row.workspaceName,
    plan: row.plan,
    lang: row.ownerLanguage === "ar" ? "ar" : "en",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!stripe || !sig) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 500 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // subscription.created/updated follows immediately; this just records
        // the customer+workspace link in case it's missing.
        const workspaceId = session.client_reference_id;
        const stripeCustomerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;

        if (workspaceId && stripeCustomerId) {
          const sub = await db.query.subscriptions.findFirst({
            where: eq(dbSchema.subscriptions.workspaceId, workspaceId),
          });
          if (sub && !sub.stripeCustomerId) {
            await db
              .update(dbSchema.subscriptions)
              .set({ stripeCustomerId, updatedAt: new Date() })
              .where(eq(dbSchema.subscriptions.workspaceId, workspaceId));
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspaceId ?? null;
        await handleSubscriptionUpsert(subscription, workspaceId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubId = subscription.id;
        const sub = await db.query.subscriptions.findFirst({
          where: eq(dbSchema.subscriptions.stripeSubscriptionId, stripeSubId),
        });
        if (sub) {
          await db
            .update(dbSchema.subscriptions)
            .set({
              status: "canceled",
              cancelAtPeriodEnd: false,
              stripeSubscriptionId: null,
              updatedAt: new Date(),
            })
            .where(eq(dbSchema.subscriptions.workspaceId, sub.workspaceId));
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        // In the 2026 API, subscription moved to invoice.parent.subscription_details.subscription
        const subRef = invoice.parent?.subscription_details?.subscription;
        const stripeSubId =
          typeof subRef === "string" ? subRef : (subRef as { id: string } | null | undefined)?.id ?? null;
        if (!stripeSubId) break;

        const sub = await db.query.subscriptions.findFirst({
          where: eq(dbSchema.subscriptions.stripeSubscriptionId, stripeSubId),
        });
        if (sub && (sub.status === "past_due" || sub.status === "trialing")) {
          await db
            .update(dbSchema.subscriptions)
            .set({ status: "active", updatedAt: new Date() })
            .where(eq(dbSchema.subscriptions.workspaceId, sub.workspaceId));
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef2 = invoice.parent?.subscription_details?.subscription;
        const stripeSubId =
          typeof subRef2 === "string" ? subRef2 : (subRef2 as { id: string } | null | undefined)?.id ?? null;
        if (!stripeSubId) break;

        const sub = await db.query.subscriptions.findFirst({
          where: eq(dbSchema.subscriptions.stripeSubscriptionId, stripeSubId),
        });
        if (sub && sub.status !== "past_due") {
          await db
            .update(dbSchema.subscriptions)
            .set({ status: "past_due", updatedAt: new Date() })
            .where(eq(dbSchema.subscriptions.workspaceId, sub.workspaceId));

          try {
            await sendFailureEmail(stripeSubId);
          } catch (err) {
            console.error("[stripe] failed to send renewal failure email:", err);
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe webhook] event handling error:", err);
    // Return 200 anyway — we don't want Stripe to keep retrying for handler bugs
  }

  return NextResponse.json({ received: true });
}
