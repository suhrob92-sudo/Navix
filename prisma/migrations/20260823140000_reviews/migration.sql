-- Baho va sharh.
--
-- Ikki ish bajariladi:
--   1. sharhlar jadvali yaratiladi;
--   2. SOXTA reyting tozalanadi.
--
-- Ikkinchisi ayniqsa muhim: bazadagi reyting ("4.7, 3420 baho")
-- boshlang'ich ma'lumotga shunchaki yozib qo'yilgan edi va uning
-- ortida birorta ham haqiqiy baho yo'q. Yolg'on reytingni qoldirish
-- xaridorni chalg'itish demak.

-- ─── Mahsulot va taomga reyting ustunlari ───────────────────────────
ALTER TABLE "products"
  ADD COLUMN "rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
  ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "menu_items"
  ADD COLUMN "rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
  ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- ─── Sharhlar jadvali ───────────────────────────────────────────────
CREATE TABLE "reviews" (
  "id" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "rating" SMALLINT NOT NULL,
  "body" VARCHAR(1000),

  "productId" UUID,
  "menuItemId" UUID,
  "restaurantId" UUID,
  "shopId" UUID,
  "hotelId" UUID,

  "marketOrderId" UUID,
  "foodOrderId" UUID,
  "bookingId" UUID,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- Baho chegarasi BAZADA ham tekshiriladi.
--
-- Dastur allaqachon tekshiradi, lekin baza — oxirgi hakam: qo'lda
-- yozilgan so'rov yoki kelajakdagi yangi kod bu qoidani chetlab
-- o'ta olmaydi.
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

-- Aynan BITTA maqsad to'ldirilishi shart.
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_single_target" CHECK (
    (CASE WHEN "productId"    IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "menuItemId"   IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "restaurantId" IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "shopId"       IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "hotelId"      IS NULL THEN 0 ELSE 1 END) = 1
  );

-- Bitta odam bitta narsaga bir marta.
--
-- Postgres bo'sh qiymatlarni farqli deb hisoblaydi, shuning uchun
-- beshta cheklov beshta turni MUSTAQIL qulflaydi.
CREATE UNIQUE INDEX "reviews_authorId_productId_key"    ON "reviews"("authorId", "productId");
CREATE UNIQUE INDEX "reviews_authorId_menuItemId_key"   ON "reviews"("authorId", "menuItemId");
CREATE UNIQUE INDEX "reviews_authorId_restaurantId_key" ON "reviews"("authorId", "restaurantId");
CREATE UNIQUE INDEX "reviews_authorId_shopId_key"       ON "reviews"("authorId", "shopId");
CREATE UNIQUE INDEX "reviews_authorId_hotelId_key"      ON "reviews"("authorId", "hotelId");

CREATE INDEX "reviews_productId_createdAt_idx"    ON "reviews"("productId", "createdAt");
CREATE INDEX "reviews_menuItemId_createdAt_idx"   ON "reviews"("menuItemId", "createdAt");
CREATE INDEX "reviews_restaurantId_createdAt_idx" ON "reviews"("restaurantId", "createdAt");
CREATE INDEX "reviews_shopId_createdAt_idx"       ON "reviews"("shopId", "createdAt");
CREATE INDEX "reviews_hotelId_createdAt_idx"      ON "reviews"("hotelId", "createdAt");
CREATE INDEX "reviews_authorId_createdAt_idx"     ON "reviews"("authorId", "createdAt");
CREATE INDEX "reviews_marketOrderId_idx"          ON "reviews"("marketOrderId");
CREATE INDEX "reviews_foodOrderId_idx"            ON "reviews"("foodOrderId");
CREATE INDEX "reviews_bookingId_idx"              ON "reviews"("bookingId");

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_menuItemId_fkey"
  FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dalil bog'lanishlari: buyurtma o'chirilsa sharh QOLADI, dalil
-- esa bo'shaydi. Aks holda eski sharhlar buyurtmalar tozalanganda
-- birdan yo'q bo'lib ketardi.
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_marketOrderId_fkey"
  FOREIGN KEY ("marketOrderId") REFERENCES "market_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_foodOrderId_fkey"
  FOREIGN KEY ("foodOrderId") REFERENCES "food_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "hotel_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Sharh haqida shikoyat ──────────────────────────────────────────
ALTER TABLE "user_reports" ADD COLUMN "reviewId" UUID;

CREATE UNIQUE INDEX "user_reports_reporterId_reviewId_key" ON "user_reports"("reporterId", "reviewId");
CREATE INDEX "user_reports_reviewId_idx" ON "user_reports"("reviewId");

ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SOXTA reytingni tozalash ───────────────────────────────────────
--
-- Bu qadamdan keyin do'kon va restoranlarda "Baho yo'q" ko'rinadi.
-- Bu bo'shliqdek tuyulishi mumkin, lekin u ROSTNI aytadi: hali
-- hech kim baho qo'ymagan.
--
-- Muqobil yo'l — soxta sonni qoldirish — xaridorni chalg'itish
-- va tizimga bo'lgan ishonchni yo'qotish demak edi.
UPDATE "shops"       SET "rating" = 0, "ratingCount" = 0;
UPDATE "restaurants" SET "rating" = 0, "ratingCount" = 0;
UPDATE "hotels"      SET "rating" = 0, "ratingCount" = 0;
