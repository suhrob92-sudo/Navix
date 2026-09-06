-- Taksi moduli: haydovchi profili va safarlar.

-- CreateEnum
CREATE TYPE "TaxiRideStatus" AS ENUM ('SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaxiTariff" AS ENUM ('ECONOM', 'COMFORT');

-- CreateTable
CREATE TABLE "taxi_drivers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "carModel" VARCHAR(60) NOT NULL,
    "carColor" VARCHAR(30) NOT NULL,
    "plateNumber" VARCHAR(20) NOT NULL,
    "tariff" "TaxiTariff" NOT NULL DEFAULT 'ECONOM',
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastLat" DECIMAL(10,7),
    "lastLng" DECIMAL(10,7),
    "locationAt" TIMESTAMP(3),
    "ratingSum" INTEGER NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "taxi_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxi_rides" (
    "id" UUID NOT NULL,
    "riderId" UUID NOT NULL,
    "driverId" UUID,
    "status" "TaxiRideStatus" NOT NULL DEFAULT 'SEARCHING',
    "tariff" "TaxiTariff" NOT NULL,
    "fromLat" DECIMAL(10,7) NOT NULL,
    "fromLng" DECIMAL(10,7) NOT NULL,
    "fromAddress" VARCHAR(255) NOT NULL,
    "toLat" DECIMAL(10,7) NOT NULL,
    "toLng" DECIMAL(10,7) NOT NULL,
    "toAddress" VARCHAR(255) NOT NULL,
    "distanceKm" DECIMAL(6,2) NOT NULL,
    "priceTiyin" BIGINT NOT NULL,
    "driverFeeTiyin" BIGINT NOT NULL,
    "paymentTransactionId" UUID,
    "payoutTransactionId" UUID,
    "idempotencyKey" VARCHAR(200),
    "driverLat" DECIMAL(10,7),
    "driverLng" DECIMAL(10,7),
    "locationAt" TIMESTAMP(3),
    "rating" INTEGER,
    "cancelReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "taxi_rides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "taxi_drivers_userId_key" ON "taxi_drivers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "taxi_drivers_plateNumber_key" ON "taxi_drivers"("plateNumber");

-- CreateIndex
CREATE INDEX "taxi_drivers_isOnline_tariff_idx" ON "taxi_drivers"("isOnline", "tariff");

-- CreateIndex
CREATE UNIQUE INDEX "taxi_rides_idempotencyKey_key" ON "taxi_rides"("idempotencyKey");

-- CreateIndex
CREATE INDEX "taxi_rides_status_createdAt_idx" ON "taxi_rides"("status", "createdAt");

-- CreateIndex
CREATE INDEX "taxi_rides_riderId_createdAt_idx" ON "taxi_rides"("riderId", "createdAt");

-- CreateIndex
CREATE INDEX "taxi_rides_driverId_createdAt_idx" ON "taxi_rides"("driverId", "createdAt");

-- AddForeignKey
ALTER TABLE "taxi_drivers" ADD CONSTRAINT "taxi_drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxi_rides" ADD CONSTRAINT "taxi_rides_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxi_rides" ADD CONSTRAINT "taxi_rides_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "taxi_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Joylashuvning uchala ustuni birga to'ldiriladi.
--
-- Ikkitasi to'lib, uchinchisi bo'sh qolsa, xarita noto'g'ri nuqtani
-- ko'rsatardi yoki ma'lumot qanchalik eskiligi bilinmasdi.
-- Qoidani DASTUR emas, BAZA qo'riqlaydi (`deliveries` dagi bilan bir xil).
ALTER TABLE "taxi_drivers" ADD CONSTRAINT "taxi_drivers_location_complete"
  CHECK (num_nonnulls("lastLat", "lastLng", "locationAt") IN (0, 3));

ALTER TABLE "taxi_rides" ADD CONSTRAINT "taxi_rides_location_complete"
  CHECK (num_nonnulls("driverLat", "driverLng", "locationAt") IN (0, 3));

-- Baho 1 dan 5 gacha bo'lishi shart.
--
-- Zod ham tekshiradi, lekin bu jadvalga admin paneli va kelajakdagi
-- skriptlar ham yozadi. Chegara bazada turgani uchun ular ham
-- noto'g'ri baho yoza olmaydi.
ALTER TABLE "taxi_rides" ADD CONSTRAINT "taxi_rides_rating_range"
  CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));

-- Pul hech qachon manfiy bo'lmaydi va haydovchi ulushi umumiy
-- summadan oshmaydi.
ALTER TABLE "taxi_rides" ADD CONSTRAINT "taxi_rides_money_sane"
  CHECK ("priceTiyin" >= 0 AND "driverFeeTiyin" >= 0 AND "driverFeeTiyin" <= "priceTiyin");
