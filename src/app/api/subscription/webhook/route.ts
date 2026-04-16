/**
 * StreamPay webhook handler.
 *
 * Handles real-time subscription lifecycle events:
 *   - INVOICE_COMPLETED: extend currentPeriodEnd on renewal
 *   - SUBSCRIPTION_CANCELED / SUBSCRIPTION_INACTIVATED: mark canceled
 *   - SUBSCRIPTION_FROZEN: mark past_due
 *   - SUBSCRIPTION_CYCLE_RENEWAL_FAILED: mark past_due + email owner
 *   - SUBSCRIPTION_CANCEL_AT_PERIOD_END: log (no action needed yet)
 *
 * Verification: HMAC-SHA256 of "{timestamp}.{rawBody}" using STREAM_WEBHOOK_SECRET.
 * Register this URL in StreamPay dashboard > Settings > Webhooks.
 */

import crypto from "crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db, dbSchema } from "@/lib/db";
import { env } from "@/lib/env";
import { sendRenewalFailedEmail } from "@/lib/emails";
import { getInvoice } from "@/lib/streampay/client";

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

function verifySignature(
  secret: string,
  rawBody: Buffer,
  sigHeader: string
): boolean {
  try {
    const parts = Object.fromEntries(
      sigHeader.split(",").map((p) => {
        const idx = p.indexOf("=");
        return [p.slice(0, idx), p.slice(idx + 1)] as [string, string];
      })
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

// ---------------------------------------------------------------------------
// Period extension helper
// ---------------------------------------------------------------------------

function periodEndFromInterval(interval: string | null | undefined): Date {
  const days = interval === "yearly" ? 365 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Webhook payload type
// ---------------------------------------------------------------------------

type WebhookPayload = {
  event_type: string;
  entity_type: string;
  entity_id: string;
  entity_url: string;
  status: string;
  timestamp: string;
  data: {
    invoice?: { id: string; url: string };
    payment?: { id: string; url: string };
    metadata?: Record<string, unknown>;
  };
};

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Read the raw body first; required for signature verification.
  const rawBody = Buffer.from(await req.arrayBuffer());

  // Verify signature if secret is configured
  const webhookSecret = env.STREAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const sigHeader = req.headers.get("x-webhook-signature") ?? "";
    if (!verifySignature(webhookSecret, rawBody, sigHeader)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf-8")) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { event_type, entity_id } = payload;

  try {
    switch (event_type) {
      case "INVOICE_COMPLETED":
        await handleInvoiceCompleted(entity_id);
        break;

      case "SUBSCRIPTION_CANCELED":
      case "SUBSCRIPTION_INACTIVATED":
        await handleSubscriptionCanceled(entity_id);
        break;

      case "SUBSCRIPTION_FROZEN":
        await handleSubscriptionFrozen(entity_id);
        break;

      case "SUBSCRIPTION_CYCLE_RENEWAL_FAILED":
        await handleRenewalFailed(entity_id);
        break;

      case "SUBSCRIPTION_CANCEL_AT_PERIOD_END":
        // Informational; no immediate DB action needed.
        console.log(`[webhook] subscription scheduled to cancel: ${entity_id}`);
        break;

      default:
        // Unhandled event; still return 200 so StreamPay doesn't retry.
        break;
    }
  } catch (err) {
    // Log but return 200 to prevent StreamPay from retrying transient errors
    console.error(`[webhook] error handling ${event_type}:`, err);
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * INVOICE_COMPLETED: only act when it belongs to a subscription renewal.
 * The subscription ID on the invoice identifies which workspace to update.
 */
async function handleInvoiceCompleted(invoiceId: string) {
  if (!db) return;

  // Fetch the full invoice to get subscription_id
  const invoice = await getInvoice(invoiceId);
  const streamSubscriptionId = invoice.subcription_id; // intentional spelling; StreamPay API typo

  if (!streamSubscriptionId) {
    // Not a subscription renewal (e.g. one-time payment); already handled by redirect callback.
    return;
  }

  // Find workspace by streamSubscriptionId
  const sub = await db.query.subscriptions.findFirst({
    where: eq(dbSchema.subscriptions.streamSubscriptionId, streamSubscriptionId),
  });

  if (!sub) {
    console.warn(`[webhook] INVOICE_COMPLETED: no subscription found for streamSubscriptionId=${streamSubscriptionId}`);
    return;
  }

  // Idempotency: skip if the period was already extended for a future date
  const now = new Date();
  if (sub.currentPeriodEnd && sub.currentPeriodEnd > now) {
    const newEnd = periodEndFromInterval(sub.billingInterval);
    // Only extend if the new end would be further in the future
    if (newEnd <= sub.currentPeriodEnd) return;
  }

  await db
    .update(dbSchema.subscriptions)
    .set({
      status: "active",
      currentPeriodEnd: periodEndFromInterval(sub.billingInterval),
      updatedAt: new Date(),
    })
    .where(eq(dbSchema.subscriptions.workspaceId, sub.workspaceId));

  console.log(`[webhook] renewed subscription for workspace ${sub.workspaceId}`);
}

/**
 * SUBSCRIPTION_CANCELED / SUBSCRIPTION_INACTIVATED: mark the workspace subscription as canceled.
 */
async function handleSubscriptionCanceled(streamSubscriptionId: string) {
  if (!db) return;

  const sub = await db.query.subscriptions.findFirst({
    where: eq(dbSchema.subscriptions.streamSubscriptionId, streamSubscriptionId),
  });

  if (!sub) return;

  await db
    .update(dbSchema.subscriptions)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(dbSchema.subscriptions.workspaceId, sub.workspaceId));

  console.log(`[webhook] canceled subscription for workspace ${sub.workspaceId}`);
}

/**
 * SUBSCRIPTION_FROZEN: treat as past_due (access restricted).
 */
async function handleSubscriptionFrozen(streamSubscriptionId: string) {
  if (!db) return;

  const sub = await db.query.subscriptions.findFirst({
    where: eq(dbSchema.subscriptions.streamSubscriptionId, streamSubscriptionId),
  });

  if (!sub) return;

  await db
    .update(dbSchema.subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(dbSchema.subscriptions.workspaceId, sub.workspaceId));

  console.log(`[webhook] frozen -> past_due for workspace ${sub.workspaceId}`);
}

/**
 * SUBSCRIPTION_CYCLE_RENEWAL_FAILED: mark past_due and email workspace owner.
 */
async function handleRenewalFailed(streamSubscriptionId: string) {
  if (!db) return;

  const result = await db
    .select({
      workspaceId: dbSchema.subscriptions.workspaceId,
      plan: dbSchema.subscriptions.plan,
      workspaceName: dbSchema.workspaces.name,
      ownerEmail: dbSchema.user.email,
      ownerName: dbSchema.user.name,
    })
    .from(dbSchema.subscriptions)
    .innerJoin(
      dbSchema.workspaces,
      eq(dbSchema.workspaces.id, dbSchema.subscriptions.workspaceId)
    )
    .innerJoin(
      dbSchema.user,
      eq(dbSchema.user.id, dbSchema.workspaces.ownerUserId)
    )
    .where(eq(dbSchema.subscriptions.streamSubscriptionId, streamSubscriptionId))
    .limit(1);

  const row = result[0];
  if (!row) return;

  await db
    .update(dbSchema.subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(dbSchema.subscriptions.workspaceId, row.workspaceId));

  // Send renewal failure email (non-blocking)
  try {
    await sendRenewalFailedEmail({
      toEmail: row.ownerEmail,
      name: row.ownerName ?? row.ownerEmail,
      workspaceName: row.workspaceName,
      plan: row.plan,
    });
  } catch (err) {
    console.error("[webhook] failed to send renewal failed email:", err);
  }

  console.log(`[webhook] renewal failed for workspace ${row.workspaceId}`);
}
