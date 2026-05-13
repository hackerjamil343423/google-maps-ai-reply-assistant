ALTER TABLE "subscriptions"
  RENAME COLUMN "stream_consumer_id" TO "geidea_customer_id";

ALTER TABLE "subscriptions"
  RENAME COLUMN "stream_subscription_id" TO "geidea_subscription_id";

ALTER TABLE "subscriptions"
  ADD COLUMN "geidea_agreement_id" text;

ALTER TABLE "subscriptions"
  ADD COLUMN "geidea_token_id" text;
