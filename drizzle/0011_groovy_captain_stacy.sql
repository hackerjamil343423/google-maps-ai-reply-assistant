CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('sync_reviews', 'post_reply', 'generate_reply');--> statement-breakpoint
CREATE TYPE "public"."reply_event_type" AS ENUM('generated', 'edited', 'rejected', 'posted_direct', 'posted_edited');--> statement-breakpoint
CREATE TABLE "admin_api_keys" (
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
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"meta_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "background_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"type" "job_type" NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"payload" text DEFAULT '{}' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"excerpt" text,
	"cover_image" text,
	"category_id" uuid,
	"author_id" text,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"og_image" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_seo_settings" (
	"id" text PRIMARY KEY DEFAULT '1' NOT NULL,
	"site_title" text DEFAULT '' NOT NULL,
	"site_description" text DEFAULT '' NOT NULL,
	"og_image" text,
	"twitter_handle" text,
	"google_analytics_id" text,
	"robots_txt" text,
	"structured_data_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_tags_name_unique" UNIQUE("name"),
	CONSTRAINT "blog_tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reply_analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"review_id" uuid NOT NULL,
	"reply_id" uuid,
	"event_type" "reply_event_type" NOT NULL,
	"tone" text,
	"was_edited" boolean,
	"time_to_post_ms" integer,
	"rating" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_analysis_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" text NOT NULL,
	"business_name" text,
	"language" text DEFAULT 'en',
	"workspace_id" uuid NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"report_data" text NOT NULL,
	"review_count" integer NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invitation_business_assignments" (
	"invitation_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitation_business_assignments_invitation_id_business_id_pk" PRIMARY KEY("invitation_id","business_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_member_business_assignments" (
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"business_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_member_business_assignments_workspace_id_user_id_business_id_pk" PRIMARY KEY("workspace_id","user_id","business_id")
);
--> statement-breakpoint
DROP INDEX "businesses_google_location_unique";--> statement-breakpoint
-- Rename geidea columns → stripe equivalents (idempotent: only runs if old name exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='geidea_customer_id') THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "geidea_customer_id" TO "stripe_customer_id";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='geidea_subscription_id') THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "geidea_subscription_id" TO "stripe_subscription_id";
  END IF;
END $$;--> statement-breakpoint
-- Add stripe_price_id (new column, no geidea equivalent)
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_price_id" text;--> statement-breakpoint
-- Drop obsolete geidea-only columns
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "geidea_agreement_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "geidea_token_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "scheduled_downgrade_plan";--> statement-breakpoint
-- Add billing columns only if they don't already exist
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "billing_interval" text DEFAULT 'monthly';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD COLUMN "business_name" text;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD COLUMN "access_all_businesses" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "language" text DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "access_all_businesses" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_api_keys" ADD CONSTRAINT "admin_api_keys_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tag_id_blog_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_analytics_events" ADD CONSTRAINT "reply_analytics_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_analytics_events" ADD CONSTRAINT "reply_analytics_events_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_analytics_events" ADD CONSTRAINT "reply_analytics_events_reply_id_review_replies_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."review_replies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_analysis_reports" ADD CONSTRAINT "review_analysis_reports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitation_business_assignments" ADD CONSTRAINT "team_invitation_business_assignments_invitation_id_team_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."team_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitation_business_assignments" ADD CONSTRAINT "team_invitation_business_assignments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member_business_assignments" ADD CONSTRAINT "workspace_member_business_assignments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member_business_assignments" ADD CONSTRAINT "workspace_member_business_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member_business_assignments" ADD CONSTRAINT "workspace_member_business_assignments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_api_keys_key_hash_idx" ON "admin_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_user_id_idx" ON "admin_audit_logs" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "background_jobs_status_run_at_idx" ON "background_jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "background_jobs_workspace_id_idx" ON "background_jobs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "blog_posts_status_idx" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blog_posts_category_id_idx" ON "blog_posts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "blog_posts_author_id_idx" ON "blog_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "reply_analytics_workspace_created_idx" ON "reply_analytics_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "reply_analytics_event_type_idx" ON "reply_analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "review_analysis_reports_business_id_idx" ON "review_analysis_reports" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "review_analysis_reports_workspace_id_idx" ON "review_analysis_reports" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "review_analysis_reports_generated_at_idx" ON "review_analysis_reports" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "team_invitation_business_assignments_business_idx" ON "team_invitation_business_assignments" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "workspace_member_business_assignments_user_idx" ON "workspace_member_business_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspace_member_business_assignments_business_idx" ON "workspace_member_business_assignments" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_google_location_unique" ON "businesses" USING btree ("workspace_id","google_location_id");