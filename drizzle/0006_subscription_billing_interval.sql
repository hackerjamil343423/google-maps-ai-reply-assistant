ALTER TABLE "subscriptions"
ADD COLUMN IF NOT EXISTS "billing_interval" text DEFAULT 'monthly';
