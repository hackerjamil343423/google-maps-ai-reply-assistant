import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { createConsumer, createPaymentLink } from "@/lib/streampay/client";
import { getPlanProductId } from "@/lib/subscription/plans";
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

  const payload = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan or billing interval." }, { status: 400 });
  }

  const { plan, billingInterval } = parsed.data;
  const productId = getPlanProductId(plan, billingInterval);
  if (!productId) {
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

  // Get or create subscription row so we can store streamConsumerId
  let sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspaceId, workspaceId),
  });

  if (!sub) {
    const [created] = await db
      .insert(subscriptions)
      .values({
        workspaceId,
        plan: "free",
        status: "trialing",
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();
    sub = created;
  }

  // Create or reuse StreamPay consumer
  let streamConsumerId = sub?.streamConsumerId ?? null;

  if (!streamConsumerId) {
    const consumer = await createConsumer({
      name: session.user.name,
      email: session.user.email,
      external_id: workspaceId,
    });
    streamConsumerId = consumer.id;

    await db
      .update(subscriptions)
      .set({ streamConsumerId, updatedAt: new Date() })
      .where(eq(subscriptions.workspaceId, workspaceId));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const paymentLink = await createPaymentLink({
    name: `${plan} Plan (${billingInterval})`,
    product_id: productId,
    organization_consumer_id: streamConsumerId,
    success_redirect_url: `${appUrl}/api/subscription/callback?plan=${encodeURIComponent(plan)}&interval=${billingInterval}`,
    failure_redirect_url: `${appUrl}/dashboard/subscription?error=payment_failed`,
    custom_metadata: {
      workspaceId,
      plan,
      billingInterval,
    },
  });

  return NextResponse.json({ checkoutUrl: paymentLink.url });
}
