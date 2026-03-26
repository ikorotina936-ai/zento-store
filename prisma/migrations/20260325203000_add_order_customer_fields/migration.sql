-- AlterTable (idempotent: columns may already exist after `prisma db push`)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customerName" VARCHAR(255);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(64);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "city" VARCHAR(120);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "line1" VARCHAR(255);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "comment" TEXT;
