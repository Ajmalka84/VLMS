-- AlterTable
ALTER TABLE "loads" ALTER COLUMN "contractor_id" DROP NOT NULL;
ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "remarks" VARCHAR(255);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "loads_site_id_date_idx" ON "loads"("site_id", "date");
CREATE INDEX IF NOT EXISTS "loads_contractor_id_date_idx" ON "loads"("contractor_id", "date");
CREATE INDEX IF NOT EXISTS "loads_vehicle_id_date_idx" ON "loads"("vehicle_id", "date");
CREATE INDEX IF NOT EXISTS "loads_deleted_at_idx" ON "loads"("deleted_at");
CREATE INDEX IF NOT EXISTS "loads_date_idx" ON "loads"("date");
