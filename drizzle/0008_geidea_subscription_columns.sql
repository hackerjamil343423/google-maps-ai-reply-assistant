DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'stream_consumer_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'geidea_customer_id'
  ) THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "stream_consumer_id" TO "geidea_customer_id";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'stream_subscription_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'geidea_subscription_id'
  ) THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "stream_subscription_id" TO "geidea_subscription_id";
  END IF;
END $$;

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "geidea_agreement_id" text;

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "geidea_token_id" text;
