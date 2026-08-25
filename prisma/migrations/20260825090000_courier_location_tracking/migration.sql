-- ---------------------------------------------------------------------
-- Kuryerning joylashuvi va ovqat buyurtmasining bosqich vaqtlari
--
-- ── Nima uchun kerak bo'ldi ──────────────────────────────────────────
-- Buyurtma sahifasida "Yo'lda" degan yozuv turardi va odamning asosiy
-- savoliga javob yo'q edi: "kuryer qayerda, yana qancha kutaman?".
--
-- Xarita ko'rsatish uchun esa MA'LUMOTNING O'ZI yo'q edi: `deliveries`
-- jadvalida koordinata ustunlari umuman bo'lmagan. Ya'ni xaritani
-- chizishdan oldin uni to'ldiradigan ma'lumotni yig'ish kerak.
-- ---------------------------------------------------------------------

ALTER TABLE "deliveries"
  ADD COLUMN "courierLat" DECIMAL(10,7),
  ADD COLUMN "courierLng" DECIMAL(10,7),
  ADD COLUMN "locationAt" TIMESTAMP(3);

-- Uchtasi BIRGA yoziladi: vaqtsiz koordinata foydasiz (uning eskiligini
-- bilib bo'lmaydi), koordinatasiz vaqt esa ma'nosiz.
ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_location_complete" CHECK (
    ("courierLat" IS NULL AND "courierLng" IS NULL AND "locationAt" IS NULL)
    OR ("courierLat" IS NOT NULL AND "courierLng" IS NOT NULL AND "locationAt" IS NOT NULL)
  );

-- Koordinata chegarasi. Buzuq qiymat xaritani okeanga surib yuborardi.
ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_location_range" CHECK (
    "courierLat" IS NULL
    OR ("courierLat" BETWEEN -90 AND 90 AND "courierLng" BETWEEN -180 AND 180)
  );

-- ── Bosqich vaqtlari ────────────────────────────────────────────────
-- `confirmedAt` va `deliveredAt` bor edi, oradagi ikki bosqichniki yo'q.
ALTER TABLE "food_orders"
  ADD COLUMN "preparingAt" TIMESTAMP(3),
  ADD COLUMN "deliveringAt" TIMESTAMP(3);

-- ── Eski buyurtmalarni to'ldirish ───────────────────────────────────
-- Kuryer topshirig'i AYNAN "yo'lga chiqarish" bosilganda yaratiladi.
-- Ya'ni uning `createdAt` i haqiqiy vaqt — o'ylab topilgan emas.
--
-- `preparingAt` uchun esa hech qanday manba yo'q va u ATAYLAB bo'sh
-- qoldiriladi: taxminiy vaqt yozish yolg'on ma'lumot bo'lardi.
UPDATE "food_orders" AS o
SET "deliveringAt" = d."createdAt"
FROM "deliveries" AS d
WHERE d."foodOrderId" = o."id";
