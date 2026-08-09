-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('PLANE', 'TRAIN', 'BUS');

-- CreateTable
CREATE TABLE "trip_schedules" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "carrier" VARCHAR(120) NOT NULL,
    "transport" "TransportType" NOT NULL,
    "fromCity" VARCHAR(80) NOT NULL,
    "toCity" VARCHAR(80) NOT NULL,
    "departTime" VARCHAR(5) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "weekdays" INTEGER[],
    "priceTiyin" BIGINT NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_bookings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "scheduleId" UUID NOT NULL,
    "ticketNumber" VARCHAR(40) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "departDate" DATE NOT NULL,
    "departAt" TIMESTAMP(3) NOT NULL,
    "arriveAt" TIMESTAMP(3) NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "pricePerSeat" BIGINT NOT NULL,
    "totalTiyin" BIGINT NOT NULL,
    "refundTiyin" BIGINT,
    "passengerName" VARCHAR(120) NOT NULL,
    "passengerPhone" VARCHAR(20) NOT NULL,
    "walletTransactionId" UUID,
    "cancelReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "trip_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_schedules_code_key" ON "trip_schedules"("code");

-- CreateIndex
CREATE INDEX "trip_schedules_fromCity_toCity_isActive_idx" ON "trip_schedules"("fromCity", "toCity", "isActive");

-- CreateIndex
CREATE INDEX "trip_schedules_transport_isActive_idx" ON "trip_schedules"("transport", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "trip_bookings_ticketNumber_key" ON "trip_bookings"("ticketNumber");

-- CreateIndex
CREATE INDEX "trip_bookings_scheduleId_departDate_status_idx" ON "trip_bookings"("scheduleId", "departDate", "status");

-- CreateIndex
CREATE INDEX "trip_bookings_userId_createdAt_idx" ON "trip_bookings"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "trip_bookings" ADD CONSTRAINT "trip_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_bookings" ADD CONSTRAINT "trip_bookings_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "trip_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

