-- Creates the initial database structure.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN','TENANT_ADMIN','WAREHOUSE_MANAGER','STAFF_MEMBER','AUDITOR','API_CLIENT');
CREATE TYPE "TenantPlan" AS ENUM ('FREE','STARTER','PROFESSIONAL','ENTERPRISE','FROZEN');
CREATE TYPE "TransferStatus" AS ENUM ('PENDING','IN_TRANSIT','COMPLETED','CANCELLED');
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE','CONFIRMED','RELEASED','EXPIRED');
CREATE TYPE "AuditAction" AS ENUM ('STOCK_ADJUSTED','STOCK_RECEIVED','ORDER_RESERVED','ORDER_CONFIRMED','TRANSFER_INITIATED','TRANSFER_COMPLETED','DECAY_APPLIED','USER_ROLE_CHANGED','TENANT_SUSPENDED','API_KEY_REVOKED','USER_REGISTERED','USER_LOGIN','USER_LOGOUT');

CREATE TABLE "tenants" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "plan" "TenantPlan" NOT NULL DEFAULT 'FREE',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'STAFF_MEMBER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "locations" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skus" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "skuCode" TEXT NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'piece',
  "costPrice" DECIMAL(12,2) NOT NULL,
  "sellPrice" DECIMAL(12,2) NOT NULL,
  "barcode" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "skus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "skuId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "reorderPoint" INTEGER NOT NULL DEFAULT 0,
  "discountPct" INTEGER NOT NULL DEFAULT 0,
  "daysInInventory" INTEGER NOT NULL DEFAULT 0,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDecayAt" TIMESTAMP(3),
  "decayCycles" INTEGER NOT NULL DEFAULT 0,
  "isSold" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_quantity_non_negative" CHECK ("quantity" >= 0),
  CONSTRAINT "inventory_discount_range" CHECK ("discountPct" >= 0 AND "discountPct" <= 90)
);

CREATE TABLE "reservations" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "inventoryId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reservations_quantity_positive" CHECK ("quantity" > 0)
);

CREATE TABLE "stock_transfers" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "skuId" UUID NOT NULL,
  "sourceLocationId" UUID NOT NULL,
  "destinationLocationId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "requestedById" UUID NOT NULL,
  "approvedById" UUID,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_transfers_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "stock_transfers_locations_distinct" CHECK ("sourceLocationId" <> "destinationLocationId")
);

CREATE TABLE "audit_log" (
  "id" BIGSERIAL NOT NULL,
  "tenantId" UUID NOT NULL,
  "actorId" UUID,
  "entityType" TEXT NOT NULL,
  "entityId" UUID NOT NULL,
  "action" "AuditAction" NOT NULL,
  "payload" JSONB NOT NULL,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");
CREATE INDEX "users_tenantId_email_idx" ON "users"("tenantId", "email");
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");
CREATE INDEX "locations_tenantId_idx" ON "locations"("tenantId");
CREATE UNIQUE INDEX "skus_tenantId_skuCode_key" ON "skus"("tenantId", "skuCode");
CREATE INDEX "skus_tenantId_idx" ON "skus"("tenantId");
CREATE INDEX "skus_tenantId_skuCode_idx" ON "skus"("tenantId", "skuCode");
CREATE UNIQUE INDEX "inventory_tenantId_skuId_locationId_key" ON "inventory"("tenantId", "skuId", "locationId");
CREATE INDEX "inventory_tenantId_skuId_idx" ON "inventory"("tenantId", "skuId");
CREATE INDEX "inventory_tenantId_locationId_idx" ON "inventory"("tenantId", "locationId");
CREATE INDEX "inventory_tenantId_daysInInventory_idx" ON "inventory"("tenantId", "daysInInventory");
CREATE INDEX "reservations_inventoryId_idx" ON "reservations"("inventoryId");
CREATE INDEX "reservations_status_expiresAt_idx" ON "reservations"("status", "expiresAt");
CREATE INDEX "stock_transfers_tenantId_status_idx" ON "stock_transfers"("tenantId", "status");
CREATE INDEX "stock_transfers_tenantId_skuId_idx" ON "stock_transfers"("tenantId", "skuId");
CREATE INDEX "audit_log_tenantId_createdAt_idx" ON "audit_log"("tenantId", "createdAt");
CREATE INDEX "audit_log_tenantId_entityId_idx" ON "audit_log"("tenantId", "entityId");
CREATE INDEX "audit_log_tenantId_actorId_createdAt_idx" ON "audit_log"("tenantId", "actorId", "createdAt");

ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skus" ADD CONSTRAINT "skus_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
