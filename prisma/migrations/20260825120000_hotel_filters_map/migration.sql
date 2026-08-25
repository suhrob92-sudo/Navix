-- ---------------------------------------------------------------------
-- Mehmonxona filtrlari va xaritasi
--
-- ── Nima uchun kerak bo'ldi ──────────────────────────────────────────
-- Mehmonxonalar ro'yxatida faqat SHAHAR filtri bor edi. Odam esa
-- boshqa savollar bilan keladi: "60 dan 90 minggacha", "kamida
-- 4 yulduz", "avtoturargohi bor".
--
-- Xarita uchun esa ma'lumotning O'ZI yo'q edi: `hotels` jadvalida
-- koordinata ustunlari umuman bo'lmagan.
-- ---------------------------------------------------------------------

ALTER TABLE "hotels"
  ADD COLUMN "latitude"  DECIMAL(10,7),
  ADD COLUMN "longitude" DECIMAL(10,7),
  ADD COLUMN "district"  VARCHAR(80);

-- Ikkalasi BIRGA yoziladi: yolg'iz kenglik xaritada ma'nosiz.
ALTER TABLE "hotels"
  ADD CONSTRAINT "hotels_coordinates_complete" CHECK (
    ("latitude" IS NULL AND "longitude" IS NULL)
    OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL)
  );

ALTER TABLE "hotels"
  ADD CONSTRAINT "hotels_coordinates_range" CHECK (
    "latitude" IS NULL
    OR ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)
  );

-- ── Qulayliklar bo'yicha filtr ──────────────────────────────────────
-- `amenities` — massiv ustun. Undagi qidiruv ("ichida 'Wi-Fi' bormi")
-- oddiy B-tree indeks bilan tezlashmaydi: u butun qiymatni taqqoslaydi,
-- massiv ICHIGA qaray olmaydi.
--
-- GIN indeks esa aynan shu uchun: u massivning har bir elementini
-- alohida yozib qo'yadi.
CREATE INDEX "hotels_amenities_idx" ON "hotels" USING GIN ("amenities");

-- Yulduz bo'yicha filtr — oddiy tenglik, B-tree yetarli.
CREATE INDEX "hotels_stars_idx" ON "hotels" ("stars");

-- Tuman ro'yxati shahar ichida so'raladi.
CREATE INDEX "hotels_city_district_idx" ON "hotels" ("city", "district");

-- ---------------------------------------------------------------------
-- ── Boshlang'ich mehmonxonalarga koordinata va tuman ────────────────
--
-- MUHIM — bu NAMUNA ma'lumot. `src/config/hotels.ts` dagi beshta
-- mehmonxona o'ylab topilgan (nomi ham, manzili ham). Ularga shahar
-- markazidagi haqiqiy koordinatalar berildi, shunda xarita bo'sh
-- turmaydi.
--
-- HAQIQIY mehmonxona qo'shilganda uning koordinatasi ANIQ bo'lishi
-- shart. Koordinatasi yo'q mehmonxona xaritada KO'RSATILMAYDI —
-- taxminiy nuqta qo'yishdan ko'ra ko'rsatmagan yaxshi.
-- ---------------------------------------------------------------------
UPDATE "hotels" SET "latitude" = 41.3111000, "longitude" = 69.2797000, "district" = 'Mirobod'    WHERE "slug" = 'navruz-plaza';
UPDATE "hotels" SET "latitude" = 39.6547000, "longitude" = 66.9758000, "district" = 'Registon'   WHERE "slug" = 'registon-saroy';
UPDATE "hotels" SET "latitude" = 39.7756000, "longitude" = 64.4286000, "district" = 'Lyabi-Havz' WHERE "slug" = 'buxoro-karvon';
UPDATE "hotels" SET "latitude" = 41.3783000, "longitude" = 60.3639000, "district" = 'Ichan Qala' WHERE "slug" = 'xiva-ichan-qala';
UPDATE "hotels" SET "latitude" = 40.3894000, "longitude" = 71.7867000, "district" = 'Markaz'     WHERE "slug" = 'fargona-vodiy';
