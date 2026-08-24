-- AlterTable: Add is_active column to sites table (Additive & Non-Breaking)
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
