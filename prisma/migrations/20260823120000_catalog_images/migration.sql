-- Katalog rasmlari.
--
-- Tekshiruvda ma'lum bo'ldi: bazadagi hech bir savdo jadvalida rasm
-- maydoni yo'q edi. Mahsulot, taom, mehmonxona, xona, do'kon, restoran
-- va kompaniya rangli kvadrat bilan ko'rsatilardi.
--
-- Sabab va tanlov `src/config/catalog-image.ts` da yozilgan.

CREATE TABLE IF NOT EXISTS "catalog_images" (
  "id"        UUID NOT NULL,
  "url"       VARCHAR(500) NOT NULL,
  "alt"       VARCHAR(120) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  "productId"    UUID,
  "menuItemId"   UUID,
  "hotelId"      UUID,
  "hotelRoomId"  UUID,
  "restaurantId" UUID,
  "shopId"       UUID,
  "companyId"    UUID,

  CONSTRAINT "catalog_images_pkey" PRIMARY KEY ("id")
);

-- ── Eng muhim cheklov: FAQAT BITTA egasi ──────────────────────────────
--
-- Kod xato qilib ikkita ustunni to'ldirsa yoki hech birini
-- to'ldirmasa, yozuv "yetim" bo'lib qolardi: uni hech kim topa
-- olmasdi, lekin u joy egallab turaverardi.
--
-- Baza darajasidagi shart buni butunlay imkonsiz qiladi.
ALTER TABLE "catalog_images"
  DROP CONSTRAINT IF EXISTS "catalog_images_single_owner";
ALTER TABLE "catalog_images"
  ADD CONSTRAINT "catalog_images_single_owner" CHECK (
    (
      ("productId"    IS NOT NULL)::int +
      ("menuItemId"   IS NOT NULL)::int +
      ("hotelId"      IS NOT NULL)::int +
      ("hotelRoomId"  IS NOT NULL)::int +
      ("restaurantId" IS NOT NULL)::int +
      ("shopId"       IS NOT NULL)::int +
      ("companyId"    IS NOT NULL)::int
    ) = 1
  );

-- Har bir tur uchun alohida indeks: ro'yxatda rasmlar tartib bo'yicha
-- o'qiladi va indekssiz butun jadval skanerlanardi.
CREATE INDEX IF NOT EXISTS "catalog_images_productId_sortOrder_idx"    ON "catalog_images"("productId", "sortOrder");
CREATE INDEX IF NOT EXISTS "catalog_images_menuItemId_sortOrder_idx"   ON "catalog_images"("menuItemId", "sortOrder");
CREATE INDEX IF NOT EXISTS "catalog_images_hotelId_sortOrder_idx"      ON "catalog_images"("hotelId", "sortOrder");
CREATE INDEX IF NOT EXISTS "catalog_images_hotelRoomId_sortOrder_idx"  ON "catalog_images"("hotelRoomId", "sortOrder");
CREATE INDEX IF NOT EXISTS "catalog_images_restaurantId_sortOrder_idx" ON "catalog_images"("restaurantId", "sortOrder");
CREATE INDEX IF NOT EXISTS "catalog_images_shopId_sortOrder_idx"       ON "catalog_images"("shopId", "sortOrder");
CREATE INDEX IF NOT EXISTS "catalog_images_companyId_sortOrder_idx"    ON "catalog_images"("companyId", "sortOrder");

-- Egasi o'chirilsa, rasmlari ham o'chadi: yetim yozuv qolmasligi kerak.
ALTER TABLE "catalog_images" ADD CONSTRAINT "catalog_images_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog_images" ADD CONSTRAINT "catalog_images_menuItemId_fkey"
  FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog_images" ADD CONSTRAINT "catalog_images_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog_images" ADD CONSTRAINT "catalog_images_hotelRoomId_fkey"
  FOREIGN KEY ("hotelRoomId") REFERENCES "hotel_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog_images" ADD CONSTRAINT "catalog_images_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog_images" ADD CONSTRAINT "catalog_images_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog_images" ADD CONSTRAINT "catalog_images_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
