-- AlterTable: Add subscription management fields to users table (Additive & Zero-Downtime Safe)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_plan" VARCHAR(50) NOT NULL DEFAULT 'ANNUAL';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_starts_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_expires_at" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "grace_period_days" INTEGER NOT NULL DEFAULT 7;
