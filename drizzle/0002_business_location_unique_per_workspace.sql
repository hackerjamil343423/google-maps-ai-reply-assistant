DROP INDEX IF EXISTS "businesses_google_location_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_google_location_unique" ON "businesses" USING btree ("workspace_id","google_location_id");
