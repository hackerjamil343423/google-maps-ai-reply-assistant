import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe/client";
import { getStripePriceId } from "@/lib/subscription/pricing";
import { ensureWorkspaceForUser } from "@/lib/workspace";

const checkoutSchema = z.object({
  plan: z.enum(["Local Business", "Multi-Location", "Agency Max"]),
  billingInterval: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "Payment provider credentials are not configured." },
      { status: 503 }
    );
  }

  const payload = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan or billing interval." }, { status: 400 });
  }

  const { plan, billingInterval } = parsed.data;

  const priceId = await getStripePriceId(plan, billingInterval);
  if (!priceId) {
    return NextResponse.json(
      { error: "Payment is not configured for this plan. Please contact support." },
      { status: 503 }
    );
  }

  const workspaceId = await ensureWorkspaceForUser(
    session.user.id,
    session.user.name
  );
  if (!workspaceId) {
    return NextResponse.json({ error: "Unable to initialize workspace." }, { status: 500 });
  }

  // Ensure a subscription row exists (trialing) so the webhook can find it
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspaceId, workspaceId),
  });

  if (!existing) {
    await db.insert(subscriptions).values({
      workspaceId,
      plan: "free",
      status: "trialing",
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  const customerId = await getOrCreateStripeCustomer({
    workspaceId,
    email: session.user.email,
    name: session.user.name,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/settings?section=billing&success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/settings?section=billing&error=cancelled`,
    subscription_data: {
      metadata: { workspaceId, plan, billingInterval },
    },
    client_reference_id: workspaceId,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
