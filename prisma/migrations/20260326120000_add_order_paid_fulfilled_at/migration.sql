-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fulfilledAt" TIMESTAMP(3);
