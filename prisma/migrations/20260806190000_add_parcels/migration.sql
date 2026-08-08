-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "parcelId" UUID;

-- CreateTable
CREATE TABLE "parcels" (
    "id" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "parcelNumber" VARCHAR(40) NOT NULL,
    "fromRegion" VARCHAR(60) NOT NULL,
    "fromAddress" VARCHAR(300) NOT NULL,
    "fromNote" VARCHAR(300),
    "toRegion" VARCHAR(60) NOT NULL,
    "toAddress" VARCHAR(300) NOT NULL,
    "toNote" VARCHAR(300),
    "recipientName" VARCHAR(120) NOT NULL,
    "recipientPhone" VARCHAR(20) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "priceTiyin" BIGINT NOT NULL,
    "courierFeeTiyin" BIGINT NOT NULL,
    "walletTransactionId" UUID,
    "cancelReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parcels_parcelNumber_key" ON "parcels"("parcelNumber");

-- CreateIndex
CREATE INDEX "parcels_senderId_createdAt_idx" ON "parcels"("senderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_parcelId_key" ON "deliveries"("parcelId");

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Yetkazish AYNAN BITTA manbaga tegishli bo'lishi shart.
--
-- Ilgari ikkita manba bor edi (ovqat va marketplace) va cheklov
-- oddiy `<>` bilan yozilgandi. Endi uchtasi bor, shuning uchun
-- "aynan bittasi to'ldirilgan" degan shartni sanab tekshiramiz.
--
-- Nima uchun dasturda emas, BAZADA: qoidani chetlab o'tadigan
-- skript yoki qo'lda yozilgan SQL ertaga paydo bo'lishi mumkin.
-- Baza esa hech kimga yon bosmaydi.
ALTER TABLE "deliveries" DROP CONSTRAINT IF EXISTS "deliveries_exactly_one_order";

ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_exactly_one_source"
  CHECK (
    (CASE WHEN "foodOrderId" IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "marketOrderId" IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "parcelId" IS NULL THEN 0 ELSE 1 END) = 1
  );
