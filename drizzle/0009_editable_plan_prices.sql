CREATE TABLE IF NOT EXISTS "platform_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "description" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "billing_amount" integer;
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "billing_currency" text DEFAULT 'SAR';
