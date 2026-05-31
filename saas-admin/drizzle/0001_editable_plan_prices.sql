ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "billing_amount" integer;
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "billing_currency" text DEFAULT 'SAR';
