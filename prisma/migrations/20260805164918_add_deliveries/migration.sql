-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'EARNING';

-- CreateTable
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL,
    "courierId" UUID,
    "foodOrderId" UUID,
    "marketOrderId" UUID,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'OFFERED',
    "feeTiyin" BIGINT NOT NULL,
    "payoutTransactionId" UUID,
    "cancelReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_foodOrderId_key" ON "deliveries"("foodOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_marketOrderId_key" ON "deliveries"("marketOrderId");

-- CreateIndex
CREATE INDEX "deliveries_status_createdAt_idx" ON "deliveries"("status", "createdAt");

-- CreateIndex
CREATE INDEX "deliveries_courierId_status_idx" ON "deliveries"("courierId", "status");

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_foodOrderId_fkey" FOREIGN KEY ("foodOrderId") REFERENCES "food_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_marketOrderId_fkey" FOREIGN KEY ("marketOrderId") REFERENCES "market_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Yetkazish AYNAN BITTA buyurtmaga tegishli bo'lishi shart.
--
-- Buni Prisma sxemasida ifodalab bo'lmaydi: ikkala ustun ham ixtiyoriy
-- ko'rinadi. Qoidani dasturda tekshirish esa yetarli emas — ertaga
-- boshqa skript yoki qo'lda yozilgan SQL uni chetlab o'tishi mumkin.
-- Shuning uchun hakam bazaning o'zi.
ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_exactly_one_order"
  CHECK (("foodOrderId" IS NULL) <> ("marketOrderId" IS NULL));
