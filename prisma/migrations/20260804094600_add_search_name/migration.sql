-- Qidiruv uchun tayyorlangan nom ustuni.
--
-- Uch qadamda bajariladi, chunki jadvalda ALLAQACHON qatorlar bor:
--   1. Ustun NULL bo'lishi mumkin qilib qo'shiladi;
--   2. Mavjud qatorlar to'ldiriladi;
--   3. Endi NOT NULL qilib mahkamlanadi.
--
-- To'ldirish qoidasi `toSearchText()` (src/lib/search.ts) bilan bir xil
-- bo'lishi SHART: avval apostrof olib tashlanadi, keyin harf va raqamdan
-- boshqa hamma narsa probelga aylanadi, oxirida ortiqcha probel yig'iladi.

-- 1-qadam
ALTER TABLE "restaurants" ADD COLUMN "searchName" VARCHAR(200);
ALTER TABLE "menu_items"  ADD COLUMN "searchName" VARCHAR(200);

-- 2-qadam
UPDATE "restaurants"
SET "searchName" = TRIM(REGEXP_REPLACE(
  REGEXP_REPLACE(LOWER("name"), '[''’‘`ʻʼ´]', '', 'g'),
  '[^[:alnum:]]+', ' ', 'g'
));

UPDATE "menu_items"
SET "searchName" = TRIM(REGEXP_REPLACE(
  REGEXP_REPLACE(LOWER("name"), '[''’‘`ʻʼ´]', '', 'g'),
  '[^[:alnum:]]+', ' ', 'g'
));

-- 3-qadam
ALTER TABLE "restaurants" ALTER COLUMN "searchName" SET NOT NULL;
ALTER TABLE "menu_items"  ALTER COLUMN "searchName" SET NOT NULL;

CREATE INDEX "restaurants_searchName_idx" ON "restaurants"("searchName");
CREATE INDEX "menu_items_searchName_idx"  ON "menu_items"("searchName");
