-- Migration: Add admin columns and tables for SaaS Admin Dashboard
-- Run this against your Neon PostgreSQL database

-- 1. Add is_admin and suspended columns to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "suspended" boolean NOT NULL DEFAULT false;

-- 2. Create platform_settings table
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "key" text PRIMARY KEY,
  "value" text NOT NULL,
  "description" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "target_type" text,
  "target_id" text,
  "meta_json" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "admin_audit_logs_admin_user_id_idx" ON "admin_audit_logs"("admin_user_id");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- 4. Create admin_api_keys table
CREATE TABLE IF NOT EXISTS "admin_api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "key_hash" text NOT NULL,
  "key_prefix" text NOT NULL,
  "permissions" text NOT NULL DEFAULT 'read',
  "created_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "last_used_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "admin_api_keys_key_hash_idx" ON "admin_api_keys"("key_hash");

-- 5. Bootstrap admin user (replace with your actual admin email)
-- UPDATE "user" SET "is_admin" = true WHERE email = 'admin@example.com';
