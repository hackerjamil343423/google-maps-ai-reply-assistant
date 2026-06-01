ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'en';
--> statement-breakpoint
ALTER TABLE "workspace_members"
  ADD COLUMN IF NOT EXISTS "access_all_businesses" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "team_invitations"
  ADD COLUMN IF NOT EXISTS "business_name" text;
--> statement-breakpoint
ALTER TABLE "team_invitations"
  ADD COLUMN IF NOT EXISTS "access_all_businesses" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "suspended" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "billing_interval" text DEFAULT 'monthly';
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "scheduled_downgrade_plan" text;
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "geidea_agreement_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "geidea_token_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "billing_amount" integer;
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "billing_currency" text DEFAULT 'SAR';
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "job_type" ADD VALUE IF NOT EXISTS 'generate_reply';
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_member_business_assignments" (
  "workspace_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "business_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "workspace_member_business_assignments_workspace_id_user_id_business_id_pk"
    PRIMARY KEY ("workspace_id","user_id","business_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_invitation_business_assignments" (
  "invitation_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "team_invitation_business_assignments_invitation_id_business_id_pk"
    PRIMARY KEY ("invitation_id","business_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "workspace_member_business_assignments"
    ADD CONSTRAINT "workspace_member_business_assignments_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "workspace_member_business_assignments"
    ADD CONSTRAINT "workspace_member_business_assignments_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "workspace_member_business_assignments"
    ADD CONSTRAINT "workspace_member_business_assignments_business_id_businesses_id_fk"
    FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "team_invitation_business_assignments"
    ADD CONSTRAINT "team_invitation_business_assignments_invitation_id_team_invitations_id_fk"
    FOREIGN KEY ("invitation_id") REFERENCES "public"."team_invitations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "team_invitation_business_assignments"
    ADD CONSTRAINT "team_invitation_business_assignments_business_id_businesses_id_fk"
    FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_member_business_assignments_user_idx"
  ON "workspace_member_business_assignments" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_member_business_assignments_business_idx"
  ON "workspace_member_business_assignments" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_invitation_business_assignments_business_idx"
  ON "team_invitation_business_assignments" USING btree ("business_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "description" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "key_hash" text NOT NULL,
  "key_prefix" text NOT NULL,
  "permissions" text DEFAULT 'read' NOT NULL,
  "created_by" text,
  "last_used_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "admin_api_keys"
    ADD CONSTRAINT "admin_api_keys_created_by_user_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_api_keys_key_hash_idx"
  ON "admin_api_keys" USING btree ("key_hash");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_user_id" text,
  "action" text NOT NULL,
  "target_type" text,
  "target_id" text,
  "meta_json" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_admin_user_id_user_id_fk"
    FOREIGN KEY ("admin_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_admin_user_id_idx"
  ON "admin_audit_logs" USING btree ("admin_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_idx"
  ON "admin_audit_logs" USING btree ("action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_at_idx"
  ON "admin_audit_logs" USING btree ("created_at");
