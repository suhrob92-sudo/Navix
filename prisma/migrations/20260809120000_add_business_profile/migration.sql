-- CreateTable
CREATE TABLE "business_profiles" (
    "id" UUID NOT NULL,
    "restaurantId" UUID,
    "shopId" UUID,
    "city" VARCHAR(80) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "phone" VARCHAR(20),
    "opensAt" VARCHAR(5) NOT NULL,
    "closesAt" VARCHAR(5) NOT NULL,
    "about" VARCHAR(600),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_follows" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "businessProfileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_restaurantId_key" ON "business_profiles"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_shopId_key" ON "business_profiles"("shopId");

-- CreateIndex
CREATE INDEX "business_follows_businessProfileId_createdAt_idx" ON "business_follows"("businessProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "business_follows_userId_createdAt_idx" ON "business_follows"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "business_follows_userId_businessProfileId_key" ON "business_follows"("userId", "businessProfileId");

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_follows" ADD CONSTRAINT "business_follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_follows" ADD CONSTRAINT "business_follows_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Profil YO restoranga, YO do'konga tegishli.
--
-- Bu shart KOD emas, BAZA darajasida: kod xato yozsa ham baza rad
-- etadi. Aynan shu naqsh `deliveries` jadvalida ham ishlatilgan.
ALTER TABLE "business_profiles"
  ADD CONSTRAINT "business_profiles_exactly_one_owner"
  CHECK (
    ("restaurantId" IS NOT NULL AND "shopId" IS NULL)
    OR ("restaurantId" IS NULL AND "shopId" IS NOT NULL)
  );
