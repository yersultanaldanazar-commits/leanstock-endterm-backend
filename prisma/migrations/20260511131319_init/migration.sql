-- Updates reservation timestamp defaults in the database schema.
-- AlterTable
ALTER TABLE "reservations" ALTER COLUMN "updatedAt" DROP DEFAULT;
