-- Restoran sahifasi: ish vaqti va taom tarkibi.

CREATE TYPE "Allergen" AS ENUM ('GLUTEN', 'DAIRY', 'EGG', 'NUTS', 'PEANUT', 'SEAFOOD', 'FISH', 'SOY', 'SESAME');

-- ── Haftalik ish vaqti ───────────────────────────────────────────────
--
-- Vaqt kun boshidan hisoblangan DAQIQADA saqlanadi (09:30 -> 570).
-- `TIME` ustuni vaqt mintaqasi bilan chalkashardi; oddiy son esa
-- xatosiz solishtiriladi. Zona faqat kodda qo'llanadi (Toshkent).
--
-- Kun uchun yozuv BO'LMASA — o'sha kuni dam olish.
CREATE TABLE "restaurant_hours" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "opensAt" INTEGER NOT NULL,
    "closesAt" INTEGER NOT NULL,

    CONSTRAINT "restaurant_hours_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurant_hours_restaurantId_weekday_key" ON "restaurant_hours"("restaurantId", "weekday");
CREATE INDEX "restaurant_hours_restaurantId_idx" ON "restaurant_hours"("restaurantId");

-- Kun 0 dan 6 gacha, vaqt esa sutka ichida bo'lishi SHART.
-- Bu tekshiruv bazada turadi: kod xato yozsa ham, yozuv o'tmaydi.
ALTER TABLE "restaurant_hours" ADD CONSTRAINT "restaurant_hours_weekday_range"
  CHECK ("weekday" >= 0 AND "weekday" <= 6);
ALTER TABLE "restaurant_hours" ADD CONSTRAINT "restaurant_hours_minutes_range"
  CHECK ("opensAt" >= 0 AND "opensAt" < 1440 AND "closesAt" >= 0 AND "closesAt" < 1440);

ALTER TABLE "restaurant_hours" ADD CONSTRAINT "restaurant_hours_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Taom tarkibi ─────────────────────────────────────────────────────
ALTER TABLE "menu_items" ADD COLUMN "ingredients" VARCHAR(500);
ALTER TABLE "menu_items" ADD COLUMN "weightGrams" INTEGER;
ALTER TABLE "menu_items" ADD COLUMN "calories" INTEGER;
ALTER TABLE "menu_items" ADD COLUMN "allergens" "Allergen"[] DEFAULT ARRAY[]::"Allergen"[];
