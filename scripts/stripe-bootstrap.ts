/**
 * One-time setup script: creates Stripe Products + Prices for all paid plans
 * in SAR, then stores the Price IDs in platformSettings so the app can look
 * them up at checkout.
 *
 * Run once after configuring STRIPE_SECRET_KEY:
 *   npx tsx --env-file=.env scripts/stripe-bootstrap.ts
 *
 * Safe to re-run — it reads existing data first and skips plans that are
 * already fully configured.
 */

import Stripe from "stripe";
import { Pool } from "@neondatabase/serverless";

const PLANS = [
  {
    name: "Local Business" as const,
    monthlyPrice: 14900,  // SAR amounts in halalas (×100)
    yearlyPrice: 143000,
  },
  {
    name: "Multi-Location" as const,
    monthlyPrice: 34900,
    yearlyPrice: 335000,
  },
  {
    name: "Agency Max" as const,
    monthlyPrice: 99900,
    yearlyPrice: 959000,
  },
];

const STRIPE_PRICE_IDS_KEY = "billing.stripe_price_ids.v1";

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is required");
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const stripe = new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" as never });
  const pool = new Pool({ connectionString: databaseUrl });

  const priceIds: Record<string, { monthly: string; yearly: string }> = {};

  for (const plan of PLANS) {
    console.log(`\nProcessing plan: ${plan.name}`);

    // Find or create the Product
    const existingProducts = await stripe.products.search({
      query: `name:"${plan.name}" AND metadata["app"]:"wakkelni-stars"`,
    });

    let product: Stripe.Product;
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`  Found existing product: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: plan.name,
        metadata: { app: "wakkelni-stars" },
      });
      console.log(`  Created product: ${product.id}`);
    }

    // Find or create monthly Price
    const existingMonthlyResult = await stripe.prices.list({
      product: product.id,
      active: true,
    });
    const existingMonthly = existingMonthlyResult.data.filter(
      (p) => p.recurring?.interval === "month"
    );

    let monthlyPriceId: string;
    if (existingMonthly.length > 0) {
      monthlyPriceId = existingMonthly[0].id;
      console.log(`  Found existing monthly price: ${monthlyPriceId}`);
    } else {
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthlyPrice,
        currency: "sar",
        recurring: { interval: "month" },
        metadata: { plan: plan.name, interval: "monthly" },
      });
      monthlyPriceId = monthlyPrice.id;
      console.log(`  Created monthly price: ${monthlyPriceId}`);
    }

    // Find or create yearly Price
    const existingYearlyResult = await stripe.prices.list({
      product: product.id,
      active: true,
    });
    const existingYearly = existingYearlyResult.data.filter(
      (p) => p.recurring?.interval === "year"
    );

    let yearlyPriceId: string;
    if (existingYearly.length > 0) {
      yearlyPriceId = existingYearly[0].id;
      console.log(`  Found existing yearly price: ${yearlyPriceId}`);
    } else {
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.yearlyPrice,
        currency: "sar",
        recurring: { interval: "year" },
        metadata: { plan: plan.name, interval: "yearly" },
      });
      yearlyPriceId = yearlyPrice.id;
      console.log(`  Created yearly price: ${yearlyPriceId}`);
    }

    priceIds[plan.name] = { monthly: monthlyPriceId, yearly: yearlyPriceId };
  }

  // Store mapping in database
  const value = JSON.stringify(priceIds);
  await pool.query(
    `INSERT INTO platform_settings (key, value, description, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [STRIPE_PRICE_IDS_KEY, value, "Stripe Price IDs for each plan and billing interval"]
  );

  console.log("\nStored price ID mapping in platform_settings:");
  console.log(JSON.stringify(priceIds, null, 2));
  console.log("\nBootstrap complete.");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
