-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY');

-- CreateEnum
CREATE TYPE "payment_mode" AS ENUM ('CASH_DRAWER', 'BANK_TRANSFER', 'UPI_ONLINE', 'VENDOR_CREDIT', 'OWNER_DIRECT');

-- AlterTable
ALTER TABLE "users" 
    ADD COLUMN IF NOT EXISTS "owner_id" UUID,
    ADD COLUMN IF NOT EXISTS "name" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "role" "user_role" NOT NULL DEFAULT 'OWNER',
    ADD COLUMN IF NOT EXISTS "assigned_site_id" UUID,
    ADD COLUMN IF NOT EXISTS "co_partner_quota" INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS "site_boy_quota" INTEGER NOT NULL DEFAULT 2;

-- AlterTable vehicle_types
ALTER TABLE "vehicle_types" ADD COLUMN IF NOT EXISTS "user_id" UUID;
ALTER TABLE "vehicle_types" DROP CONSTRAINT IF EXISTS "vehicle_types_name_key";

-- AlterTable material_types
ALTER TABLE "material_types" ADD COLUMN IF NOT EXISTS "user_id" UUID;
ALTER TABLE "material_types" DROP CONSTRAINT IF EXISTS "material_types_name_key";

-- CreateTable
CREATE TABLE IF NOT EXISTS "partner_site_shares" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "share_percentage" DECIMAL(5,2) NOT NULL,
    "effective_from" DATE NOT NULL DEFAULT CURRENT_DATE,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_site_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "partner_payouts" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "partner_user_id" UUID NOT NULL,
    "recorded_by_user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_mode" "payment_mode" NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference_number" VARCHAR(100),
    "remarks" VARCHAR(255),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "expense_categories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "machinery" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50),
    "default_rent_per_hour" DECIMAL(10,2),
    "vendor_name" VARCHAR(100),
    "vendor_mobile" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machinery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "expenses" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "recorded_by_user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_mode" "payment_mode" NOT NULL DEFAULT 'CASH_DRAWER',
    "paid_to" VARCHAR(100),
    "remarks" VARCHAR(255),
    "machinery_id" UUID,
    "start_time" VARCHAR(20),
    "closing_time" VARCHAR(20),
    "start_meter_reading" DECIMAL(10,2),
    "end_meter_reading" DECIMAL(10,2),
    "total_hours" DECIMAL(6,2),
    "rent_per_hour" DECIMAL(10,2),
    "advance_amount" DECIMAL(12,2) DEFAULT 0.00,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shift_reconciliations" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "supervisor_user_id" UUID NOT NULL,
    "approved_by_user_id" UUID,
    "date" DATE NOT NULL,
    "shift_type" VARCHAR(20) NOT NULL DEFAULT 'DAY',
    "opening_cash" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "cash_inflows" DECIMAL(12,2) NOT NULL,
    "cash_outflows" DECIMAL(12,2) NOT NULL,
    "expected_cash" DECIMAL(12,2) NOT NULL,
    "actual_handover_cash" DECIMAL(12,2) NOT NULL,
    "discrepancy" DECIMAL(12,2) NOT NULL,
    "remarks" VARCHAR(255),
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "quota_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "quota_type" VARCHAR(50) NOT NULL,
    "previous_quota" INTEGER NOT NULL,
    "new_quota" INTEGER NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "payment_ref" VARCHAR(100),
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quota_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_owner_id_idx" ON "users"("owner_id");
CREATE INDEX IF NOT EXISTS "users_mobile_idx" ON "users"("mobile");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_types_user_id_name_key" ON "vehicle_types"("user_id", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "material_types_user_id_name_key" ON "material_types"("user_id", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_site_shares_user_id_site_id_effective_from_effectiv_idx" ON "partner_site_shares"("user_id", "site_id", "effective_from", "effective_to");
CREATE INDEX IF NOT EXISTS "partner_payouts_site_id_partner_user_id_date_idx" ON "partner_payouts"("site_id", "partner_user_id", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_user_id_name_key" ON "expense_categories"("user_id", "name");
CREATE INDEX IF NOT EXISTS "expenses_site_id_date_idx" ON "expenses"("site_id", "date");
CREATE INDEX IF NOT EXISTS "expenses_category_id_date_idx" ON "expenses"("category_id", "date");
CREATE INDEX IF NOT EXISTS "expenses_machinery_id_date_idx" ON "expenses"("machinery_id", "date");
CREATE INDEX IF NOT EXISTS "expenses_deleted_at_idx" ON "expenses"("deleted_at");
CREATE INDEX IF NOT EXISTS "shift_reconciliations_site_id_date_idx" ON "shift_reconciliations"("site_id", "date");

-- AddForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_assigned_site_id_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_assigned_site_id_fkey" FOREIGN KEY ("assigned_site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "partner_site_shares" DROP CONSTRAINT IF EXISTS "partner_site_shares_user_id_fkey";
ALTER TABLE "partner_site_shares" ADD CONSTRAINT "partner_site_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_site_shares" DROP CONSTRAINT IF EXISTS "partner_site_shares_site_id_fkey";
ALTER TABLE "partner_site_shares" ADD CONSTRAINT "partner_site_shares_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_payouts" DROP CONSTRAINT IF EXISTS "partner_payouts_site_id_fkey";
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_payouts" DROP CONSTRAINT IF EXISTS "partner_payouts_partner_user_id_fkey";
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_partner_user_id_fkey" FOREIGN KEY ("partner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_payouts" DROP CONSTRAINT IF EXISTS "partner_payouts_recorded_by_user_id_fkey";
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vehicle_types" DROP CONSTRAINT IF EXISTS "vehicle_types_user_id_fkey";
ALTER TABLE "vehicle_types" ADD CONSTRAINT "vehicle_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "material_types" DROP CONSTRAINT IF EXISTS "material_types_user_id_fkey";
ALTER TABLE "material_types" ADD CONSTRAINT "material_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense_categories" DROP CONSTRAINT IF EXISTS "expense_categories_user_id_fkey";
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "machinery" DROP CONSTRAINT IF EXISTS "machinery_user_id_fkey";
ALTER TABLE "machinery" ADD CONSTRAINT "machinery_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_site_id_fkey";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_category_id_fkey";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_recorded_by_user_id_fkey";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_machinery_id_fkey";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_machinery_id_fkey" FOREIGN KEY ("machinery_id") REFERENCES "machinery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shift_reconciliations" DROP CONSTRAINT IF EXISTS "shift_reconciliations_site_id_fkey";
ALTER TABLE "shift_reconciliations" ADD CONSTRAINT "shift_reconciliations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shift_reconciliations" DROP CONSTRAINT IF EXISTS "shift_reconciliations_supervisor_user_id_fkey";
ALTER TABLE "shift_reconciliations" ADD CONSTRAINT "shift_reconciliations_supervisor_user_id_fkey" FOREIGN KEY ("supervisor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_reconciliations" DROP CONSTRAINT IF EXISTS "shift_reconciliations_approved_by_user_id_fkey";
ALTER TABLE "shift_reconciliations" ADD CONSTRAINT "shift_reconciliations_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quota_transactions" DROP CONSTRAINT IF EXISTS "quota_transactions_user_id_fkey";
ALTER TABLE "quota_transactions" ADD CONSTRAINT "quota_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
