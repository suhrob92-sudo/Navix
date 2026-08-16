-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('PRODUCT', 'MENU_ITEM', 'RESTAURANT', 'VACANCY', 'HOTEL');

-- CreateTable
CREATE TABLE "post_attachments" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "productId" UUID,
    "menuItemId" UUID,
    "restaurantId" UUID,
    "vacancyId" UUID,
    "hotelId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_attachments_postId_sortOrder_idx" ON "post_attachments"("postId", "sortOrder");
CREATE INDEX "post_attachments_productId_idx" ON "post_attachments"("productId");
CREATE INDEX "post_attachments_menuItemId_idx" ON "post_attachments"("menuItemId");
CREATE INDEX "post_attachments_restaurantId_idx" ON "post_attachments"("restaurantId");
CREATE INDEX "post_attachments_vacancyId_idx" ON "post_attachments"("vacancyId");
CREATE INDEX "post_attachments_hotelId_idx" ON "post_attachments"("hotelId");

-- AddForeignKey
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tur va ustun MOS kelishi shart.
--
-- Busiz `kind = 'PRODUCT'` bo'lgan qatorda `vacancyId` to'ldirilishi
-- mumkin edi va lenta tugmani noto'g'ri joyga olib borardi. Bunday
-- xatoni kodda ushlash qiyin: u faqat bitta noto'g'ri yozuvda
-- ko'rinadi va sinovlarda umuman chiqmaydi.
--
-- Shart bazada tursa, bunday qator UMUMAN yozilmaydi.
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_one_target" CHECK (
    (CASE WHEN "productId"    IS NULL THEN 0 ELSE 1 END)
  + (CASE WHEN "menuItemId"   IS NULL THEN 0 ELSE 1 END)
  + (CASE WHEN "restaurantId" IS NULL THEN 0 ELSE 1 END)
  + (CASE WHEN "vacancyId"    IS NULL THEN 0 ELSE 1 END)
  + (CASE WHEN "hotelId"      IS NULL THEN 0 ELSE 1 END) = 1
  AND ("kind" <> 'PRODUCT'    OR "productId"    IS NOT NULL)
  AND ("kind" <> 'MENU_ITEM'  OR "menuItemId"   IS NOT NULL)
  AND ("kind" <> 'RESTAURANT' OR "restaurantId" IS NOT NULL)
  AND ("kind" <> 'VACANCY'    OR "vacancyId"    IS NOT NULL)
  AND ("kind" <> 'HOTEL'      OR "hotelId"      IS NOT NULL)
);

-- Bitta narsa bitta postga BIR MARTA biriktiriladi.
--
-- Oddiy `UNIQUE` bu yerda ishlamaydi: ustunlarning to'rttasi har doim
-- `NULL` va Postgres `NULL` larni bir-biriga teng deb hisoblamaydi —
-- ya'ni cheklov hech qachon ishga tushmasdi. Qisman indeks esa aynan
-- to'ldirilgan ustun bo'yicha tekshiradi.
CREATE UNIQUE INDEX "post_attachments_post_product_key" ON "post_attachments"("postId", "productId") WHERE "productId" IS NOT NULL;
CREATE UNIQUE INDEX "post_attachments_post_menu_item_key" ON "post_attachments"("postId", "menuItemId") WHERE "menuItemId" IS NOT NULL;
CREATE UNIQUE INDEX "post_attachments_post_restaurant_key" ON "post_attachments"("postId", "restaurantId") WHERE "restaurantId" IS NOT NULL;
CREATE UNIQUE INDEX "post_attachments_post_vacancy_key" ON "post_attachments"("postId", "vacancyId") WHERE "vacancyId" IS NOT NULL;
CREATE UNIQUE INDEX "post_attachments_post_hotel_key" ON "post_attachments"("postId", "hotelId") WHERE "hotelId" IS NOT NULL;

-- Mavjud biriktirmalar KO'CHIRILADI.
--
-- Ular allaqachon joylangan videolarga tegishli. Ko'chirmasak, eski
-- videolardagi mahsulot tugmalari jimgina yo'qolardi — muallif
-- buni sezmasdi ham.
INSERT INTO "post_attachments" ("id", "postId", "kind", "productId", "sortOrder", "clickCount", "createdAt")
SELECT gen_random_uuid(), "postId", 'PRODUCT', "productId", "sortOrder", "clickCount", "createdAt"
FROM "post_products";

-- DropTable
DROP TABLE "post_products";
