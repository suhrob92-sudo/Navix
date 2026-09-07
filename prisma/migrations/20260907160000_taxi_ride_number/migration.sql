-- Odam o'qiydigan safar raqami.
--
-- ── Nima uchun UCH QADAM ──────────────────────────────────────────────
-- Ustun NOT NULL va UNIQUE bo'lishi kerak, lekin jadvalda allaqachon
-- qatorlar bor. Ularni bir vaqtda qo'shib bo'lmaydi: mavjud qatorlarda
-- qiymat yo'q va baza cheklovni buzilgan deb hisoblardi.
--
-- Shuning uchun: avval bo'sh ustun, keyin to'ldirish, oxirida cheklov.

-- 1. Bo'sh ustun.
ALTER TABLE "taxi_rides" ADD COLUMN "rideNumber" VARCHAR(40);

-- 2. Mavjud qatorlarni to'ldiramiz.
--
-- Raqam yaratilgan SANA va tasodifiy qism bilan yasaladi — dasturdagi
-- `generateRideNumber()` bilan bir xil shakl. Tasodifiy qism `md5`
-- dan olinadi: har qatorda boshqacha bo'lishi va takrorlanmasligi
-- uchun qator ID'si manba qilib olingan.
UPDATE "taxi_rides"
SET "rideNumber" = 'NVX-T-'
  || to_char("createdAt", 'YYYYMMDD')
  || '-'
  || upper(substring(md5("id"::text) from 1 for 6))
WHERE "rideNumber" IS NULL;

-- 3. Endi cheklovlarni qo'yish xavfsiz.
ALTER TABLE "taxi_rides" ALTER COLUMN "rideNumber" SET NOT NULL;

CREATE UNIQUE INDEX "taxi_rides_rideNumber_key" ON "taxi_rides" ("rideNumber");
