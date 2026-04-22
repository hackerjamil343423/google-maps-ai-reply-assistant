ALTER TABLE "subscriptions"
  ADD COLUMN "cancel_at_period_end" boolean NOT NULL DEFAULT false;

ALTER TABLE "subscriptions"
  ADD COLUMN "scheduled_downgrade_plan" text;
