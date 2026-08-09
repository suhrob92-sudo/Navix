-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "hotels" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "searchName" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "city" VARCHAR(80) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 3,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "amenities" VARCHAR(60)[],
    "color" VARCHAR(20) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_rooms" (
    "id" UUID NOT NULL,
    "hotelId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "pricePerNight" BIGINT NOT NULL,
    "totalRooms" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hotel_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_bookings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "bookingNumber" VARCHAR(40) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "guests" INTEGER NOT NULL DEFAULT 1,
    "pricePerNight" BIGINT NOT NULL,
    "totalTiyin" BIGINT NOT NULL,
    "guestName" VARCHAR(120) NOT NULL,
    "guestPhone" VARCHAR(20) NOT NULL,
    "walletTransactionId" UUID,
    "cancelReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "hotel_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotels_slug_key" ON "hotels"("slug");

-- CreateIndex
CREATE INDEX "hotels_city_isActive_idx" ON "hotels"("city", "isActive");

-- CreateIndex
CREATE INDEX "hotels_searchName_idx" ON "hotels"("searchName");

-- CreateIndex
CREATE INDEX "hotel_rooms_hotelId_isActive_idx" ON "hotel_rooms"("hotelId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_bookings_bookingNumber_key" ON "hotel_bookings"("bookingNumber");

-- CreateIndex
CREATE INDEX "hotel_bookings_roomId_checkIn_checkOut_idx" ON "hotel_bookings"("roomId", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "hotel_bookings_userId_createdAt_idx" ON "hotel_bookings"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "hotel_rooms" ADD CONSTRAINT "hotel_rooms_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "hotel_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

