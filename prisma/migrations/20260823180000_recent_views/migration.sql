-- Yaqinda ko'rilganlar.
--
-- Odam mahsulotni ochadi, "o'ylab ko'raman" deb chiqib ketadi va
-- ertaga uni topa olmaydi. Bu ro'yxat hech narsa talab qilmaydi —
-- u o'zi to'ladi.

CREATE TABLE "recent_views" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,

  "productId" UUID,
  "menuItemId" UUID,
  "restaurantId" UUID,
  "hotelId" UUID,
  "vacancyId" UUID,

  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recent_views_pkey" PRIMARY KEY ("id")
);

-- Aynan BITTA maqsad to'ldirilishi shart.
ALTER TABLE "recent_views"
  ADD CONSTRAINT "recent_views_single_target" CHECK (
    (CASE WHEN "productId"    IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "menuItemId"   IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "restaurantId" IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "hotelId"      IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "vacancyId"    IS NULL THEN 0 ELSE 1 END) = 1
  );

-- Bitta narsa ro'yxatda bir marta: takroriy ochish VAQTNI yangilaydi.
--
-- Usiz bitta mahsulotni o'n marta ochgan odam ro'yxatini o'sha
-- mahsulot to'ldirib yuborardi.
CREATE UNIQUE INDEX "recent_views_userId_productId_key"    ON "recent_views"("userId", "productId");
CREATE UNIQUE INDEX "recent_views_userId_menuItemId_key"   ON "recent_views"("userId", "menuItemId");
CREATE UNIQUE INDEX "recent_views_userId_restaurantId_key" ON "recent_views"("userId", "restaurantId");
CREATE UNIQUE INDEX "recent_views_userId_hotelId_key"      ON "recent_views"("userId", "hotelId");
CREATE UNIQUE INDEX "recent_views_userId_vacancyId_key"    ON "recent_views"("userId", "vacancyId");

CREATE INDEX "recent_views_userId_viewedAt_idx" ON "recent_views"("userId", "viewedAt");
CREATE INDEX "recent_views_productId_idx"       ON "recent_views"("productId");
CREATE INDEX "recent_views_menuItemId_idx"      ON "recent_views"("menuItemId");
CREATE INDEX "recent_views_restaurantId_idx"    ON "recent_views"("restaurantId");
CREATE INDEX "recent_views_hotelId_idx"         ON "recent_views"("hotelId");
CREATE INDEX "recent_views_vacancyId_idx"       ON "recent_views"("vacancyId");

ALTER TABLE "recent_views" ADD CONSTRAINT "recent_views_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recent_views" ADD CONSTRAINT "recent_views_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recent_views" ADD CONSTRAINT "recent_views_menuItemId_fkey"
  FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recent_views" ADD CONSTRAINT "recent_views_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recent_views" ADD CONSTRAINT "recent_views_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recent_views" ADD CONSTRAINT "recent_views_vacancyId_fkey"
  FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
