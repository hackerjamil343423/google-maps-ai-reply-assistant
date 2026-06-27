CREATE TABLE IF NOT EXISTS "review_comparison_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "language" text DEFAULT 'en',
  "comparison_key" text NOT NULL,
  "business_count" integer NOT NULL,
  "business_snapshot" text NOT NULL,
  "report_data" text NOT NULL,
  "review_count" integer NOT NULL,
  "period_start" timestamp with time zone NOT NULL,
  "period_end" timestamp with time zone NOT NULL,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_comparison_report_businesses" (
  "report_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "business_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "review_comparison_report_businesses_report_id_business_id_pk" PRIMARY KEY("report_id","business_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "review_comparison_reports"
    ADD CONSTRAINT "review_comparison_reports_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "review_comparison_report_businesses"
    ADD CONSTRAINT "review_comparison_report_businesses_report_id_review_comparison_reports_id_fk"
    FOREIGN KEY ("report_id") REFERENCES "public"."review_comparison_reports"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "review_comparison_report_businesses"
    ADD CONSTRAINT "review_comparison_report_businesses_business_id_businesses_id_fk"
    FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_comparison_reports_workspace_id_idx" ON "review_comparison_reports" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_comparison_reports_comparison_key_idx" ON "review_comparison_reports" USING btree ("comparison_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_comparison_reports_generated_at_idx" ON "review_comparison_reports" USING btree ("generated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_comparison_reports_workspace_key_generated_idx" ON "review_comparison_reports" USING btree ("workspace_id","comparison_key","generated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_comparison_report_businesses_business_id_idx" ON "review_comparison_report_businesses" USING btree ("business_id");
