-- Sevimlilar — "keyin qaytaman" ro'yxati.
--
-- Xaridorlarning katta qismi birinchi ko'rishda sotib olmaydi.
-- Ro'yxatsiz u mahsulotni ertaga topa olmaydi va qaytmaydi.

CREATE TABLE "favorites" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,

  "productId" UUID,
  "menuItemId" UUID,
  "restaurantId" UUID,
  "hotelId" UUID,
  "vacancyId" UUID,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- Aynan BITTA maqsad to'ldirilishi shart.
ALTER TABLE "favorites"
  ADD CONSTRAINT "favorites_single_target" CHECK (
    (CASE WHEN "productId"    IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "menuItemId"   IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "restaurantId" IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "hotelId"      IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "vacancyId"    IS NULL THEN 0 ELSE 1 END) = 1
  );

-- Bitta narsa ro'yxatda bir marta.
--
-- Bu cheklov shunchaki tartib uchun emas: u tugmani ikki marta
-- bosishni ham xavfsiz qiladi. Ikki so'rov bir vaqtda kelsa,
-- ikkinchisi baza darajasida to'xtatiladi.
CREATE UNIQUE INDEX "favorites_userId_productId_key"    ON "favorites"("userId", "productId");
CREATE UNIQUE INDEX "favorites_userId_menuItemId_key"   ON "favorites"("userId", "menuItemId");
CREATE UNIQUE INDEX "favorites_userId_restaurantId_key" ON "favorites"("userId", "restaurantId");
CREATE UNIQUE INDEX "favorites_userId_hotelId_key"      ON "favorites"("userId", "hotelId");
CREATE UNIQUE INDEX "favorites_userId_vacancyId_key"    ON "favorites"("userId", "vacancyId");

CREATE INDEX "favorites_userId_createdAt_idx" ON "favorites"("userId", "createdAt");
CREATE INDEX "favorites_productId_idx"        ON "favorites"("productId");
CREATE INDEX "favorites_menuItemId_idx"       ON "favorites"("menuItemId");
CREATE INDEX "favorites_restaurantId_idx"     ON "favorites"("restaurantId");
CREATE INDEX "favorites_hotelId_idx"          ON "favorites"("hotelId");
CREATE INDEX "favorites_vacancyId_idx"        ON "favorites"("vacancyId");

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_menuItemId_fkey"
  FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_vacancyId_fkey"
  FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
