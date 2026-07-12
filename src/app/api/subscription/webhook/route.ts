import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe/client";
import { handleStripeEvent } from "@/lib/stripe/webhook-handlers";

// Required so Next.js does not parse the body - Stripe needs the raw bytes to
// verify the signature.
export const dynamic = "force-dynamic";

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
    await handleStripeEvent(event);
  } catch (err) {
    console.error("[stripe webhook] event handling error:", err);
    // Return 200 anyway - we don't want Stripe to keep retrying for handler bugs.
  }

  return NextResponse.json({ received: true });
}
