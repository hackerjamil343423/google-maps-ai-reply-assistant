CREATE TYPE "public"."job_type" AS ENUM('sync_reviews', 'post_reply');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."reply_event_type" AS ENUM('generated', 'edited', 'rejected', 'posted_direct', 'posted_edited');--> statement-breakpoint

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

ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_analytics_events" ADD CONSTRAINT "reply_analytics_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_analytics_events" ADD CONSTRAINT "reply_analytics_events_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_analytics_events" ADD CONSTRAINT "reply_analytics_events_reply_id_review_replies_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."review_replies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "background_jobs_status_run_at_idx" ON "background_jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "background_jobs_workspace_id_idx" ON "background_jobs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "reply_analytics_workspace_created_idx" ON "reply_analytics_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "reply_analytics_event_type_idx" ON "reply_analytics_events" USING btree ("event_type");
