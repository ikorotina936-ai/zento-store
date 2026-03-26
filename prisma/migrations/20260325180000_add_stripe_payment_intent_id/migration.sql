-- AlterTable (idempotent: column may already exist after `prisma db push`)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" VARCHAR(255);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "orders_stripePaymentIntentId_key" ON "orders"("stripePaymentIntentId");
