-- Rename Stripe columns to StreamPay equivalents in subscriptions table
ALTER TABLE "subscriptions" RENAME COLUMN "stripe_customer_id" TO "stream_consumer_id";
ALTER TABLE "subscriptions" RENAME COLUMN "stripe_subscription_id" TO "stream_subscription_id";
