-- Adds production features for reservations and forecasting.
-- Add tenant-level reservation isolation and sales history for forecasting.
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "tenantId" UUID;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "reservations" r
SET "tenantId" = i."tenantId"
FROM "inventory" i
WHERE r."inventoryId" = i."id" AND r."tenantId" IS NULL;
ALTER TABLE "reservations" ALTER COLUMN "tenantId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_tenantId_fkey'
  ) THEN
    ALTER TABLE "reservations"
      ADD CONSTRAINT "reservations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "reservations_tenantId_orderId_inventoryId_key" ON "reservations"("tenantId", "orderId", "inventoryId");
CREATE INDEX IF NOT EXISTS "reservations_tenantId_status_expiresAt_idx" ON "reservations"("tenantId", "status", "expiresAt");

CREATE TABLE IF NOT EXISTS "sales_history" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "skuId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "quantitySold" INTEGER NOT NULL,
  "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sales_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sales_history_quantity_positive" CHECK ("quantitySold" > 0)
);

CREATE INDEX IF NOT EXISTS "sales_history_tenantId_skuId_locationId_soldAt_idx" ON "sales_history"("tenantId", "skuId", "locationId", "soldAt");
CREATE INDEX IF NOT EXISTS "sales_history_tenantId_soldAt_idx" ON "sales_history"("tenantId", "soldAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_history_tenantId_fkey') THEN
    ALTER TABLE "sales_history" ADD CONSTRAINT "sales_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_history_skuId_fkey') THEN
    ALTER TABLE "sales_history" ADD CONSTRAINT "sales_history_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_history_locationId_fkey') THEN
    ALTER TABLE "sales_history" ADD CONSTRAINT "sales_history_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
