import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" as never })
  : null;

/**
 * Returns the existing Stripe customer ID for a workspace, or creates a new
 * Stripe Customer and persists the ID before returning it.
 */
export async function getOrCreateStripeCustomer(input: {
  workspaceId: string;
  email: string;
  name: string;
}): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured.");
  if (!db) throw new Error("Database is not configured.");

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspaceId, input.workspaceId),
  });

  if (sub?.stripeCustomerId) {
    return sub.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: { workspaceId: input.workspaceId },
  });

  await db
    .update(subscriptions)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(subscriptions.workspaceId, input.workspaceId));

  return customer.id;
}
