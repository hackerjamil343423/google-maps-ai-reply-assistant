import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db, dbSchema } from "@/lib/db";
import { sendRenewalFailedEmail } from "@/lib/emails";
import { isKnownPlan } from "@/lib/subscription/plans";
import { PAID_PLAN_NAMES } from "@/lib/subscription/pricing";

const PLAN_BY_PRICE = new Map<string, string>();
const ENTITLED_STATUSES: Stripe.Subscription["status"][] = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
];

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

export function mapStripeStatus(
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

export async function handleSubscriptionUpsert(
  subscription: Stripe.Subscription,
  workspaceIdHint?: string | null,
  eventCreatedAt?: Date
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

  const periodEndTs = priceItem?.current_period_end;
  const currentPeriodEnd = periodEndTs
    ? new Date(periodEndTs * 1000)
    : ENTITLED_STATUSES.includes(subscription.status)
      ? new Date(
          Date.now() +
            (billingInterval === "yearly" ? 365 : 30) * 86400 * 1000
        )
      : null;
  const status = mapStripeStatus(subscription.status);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  let matchedBySubscriptionId = true;
  let sub = await db.query.subscriptions.findFirst({
    where: eq(dbSchema.subscriptions.stripeSubscriptionId, stripeSubId),
  });

  if (!sub && stripeCustomerId) {
    matchedBySubscriptionId = false;
    sub = await db.query.subscriptions.findFirst({
      where: eq(dbSchema.subscriptions.stripeCustomerId, stripeCustomerId),
    });
  }

  if (!sub && workspaceIdHint) {
    matchedBySubscriptionId = false;
    sub = await db.query.subscriptions.findFirst({
      where: eq(dbSchema.subscriptions.workspaceId, workspaceIdHint),
    });
  }

  if (!sub) {
    console.warn(`[stripe] no subscription row found for ${stripeSubId}`);
    return;
  }

  if (
    !matchedBySubscriptionId &&
    sub.status === "canceled" &&
    sub.stripeSubscriptionId === null
  ) {
    const isFreshResubscribe =
      (subscription.status === "active" || subscription.status === "trialing") &&
      eventCreatedAt != null &&
      eventCreatedAt > sub.updatedAt;
    if (!isFreshResubscribe) {
      console.warn(
        `[stripe] ignored stale subscription event ${stripeSubId} for terminal workspace ${sub.workspaceId}`
      );
      return;
    }
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

async function recordWebhookEvent(event: Stripe.Event) {
  if (!db) return true;

  const inserted = await db
    .insert(dbSchema.stripeWebhookEvents)
    .values({
      id: event.id,
      type: event.type,
      eventCreatedAt: new Date(event.created * 1000),
    })
    .onConflictDoNothing({ target: dbSchema.stripeWebhookEvents.id })
    .returning({ id: dbSchema.stripeWebhookEvents.id });

  if (inserted.length === 0) {
    console.log(`[stripe] duplicate webhook event ignored: ${event.id}`);
    return false;
  }
  return true;
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  if (!db) return;
  const shouldProcess = await recordWebhookEvent(event);
  if (!shouldProcess) return;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
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
      await handleSubscriptionUpsert(
        subscription,
        workspaceId,
        new Date(event.created * 1000)
      );
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
      const subRef = invoice.parent?.subscription_details?.subscription;
      const stripeSubId =
        typeof subRef === "string"
          ? subRef
          : (subRef as { id: string } | null | undefined)?.id ?? null;
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
      const subRef = invoice.parent?.subscription_details?.subscription;
      const stripeSubId =
        typeof subRef === "string"
          ? subRef
          : (subRef as { id: string } | null | undefined)?.id ?? null;
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
}
