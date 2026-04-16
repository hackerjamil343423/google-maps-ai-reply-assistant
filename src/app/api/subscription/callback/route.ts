import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { getInvoice, getPayment } from "@/lib/streampay/client";
import { isKnownPlan } from "@/lib/subscription/plans";

function periodEndFromInterval(interval: string): Date {
  const days = interval === "yearly" ? 365 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const paymentId = searchParams.get("payment_id");
  const invoiceId = searchParams.get("invoice_id");
  const plan = searchParams.get("plan");
  const consumerId = searchParams.get("organization_consumer_id");
  const billingInterval = searchParams.get("interval") ?? "monthly";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const failureUrl = `${appUrl}/dashboard/subscription?error=payment_failed`;

  if (status !== "paid" || !paymentId || !invoiceId || !plan) {
    return NextResponse.redirect(failureUrl);
  }

  if (!isKnownPlan(plan) || plan === "free") {
    return NextResponse.redirect(failureUrl);
  }

  if (!db) {
    return NextResponse.redirect(failureUrl);
  }

  try {
    // Server-side verification — never trust redirect params alone
    const payment = await getPayment(paymentId);
    if (payment.current_status !== "SUCCEEDED") {
      return NextResponse.redirect(failureUrl);
    }

    const invoice = await getInvoice(invoiceId);
    const streamSubscriptionId = invoice.subcription_id ?? null;

    // Find subscription by streamConsumerId (set during checkout)
    const sub = consumerId
      ? await db.query.subscriptions.findFirst({
          where: eq(subscriptions.streamConsumerId, consumerId),
        })
      : null;

    if (!sub) {
      return NextResponse.redirect(failureUrl);
    }

    await db
      .update(subscriptions)
      .set({
        plan,
        status: "active",
        billingInterval,
        currentPeriodEnd: periodEndFromInterval(billingInterval),
        ...(streamSubscriptionId ? { streamSubscriptionId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.workspaceId, sub.workspaceId));

    return NextResponse.redirect(`${appUrl}/dashboard/subscription?success=true`);
  } catch {
    return NextResponse.redirect(failureUrl);
  }
}
