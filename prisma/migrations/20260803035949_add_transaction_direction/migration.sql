-- Pul yo'nalishini ANIQ saqlash.
--
-- Nima uchun kerak: ilgari yo'nalish tranzaksiya TURIDAN taxmin qilinardi.
-- Ammo o'tkazmada (TRANSFER) yuboruvchi uchun bu chiqim, qabul qiluvchi
-- uchun esa kirim — turi ikkalasida ham bir xil. Natijada qabul qiluvchining
-- tarixida kelgan pul "chiqim" bo'lib ko'rinardi.
--
-- Moliyaviy jurnal taxminga asoslanmasligi kerak, shuning uchun yo'nalish
-- alohida ustunda saqlanadi.

-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('IN', 'OUT');

-- Avval NULL bo'lishi mumkin bo'lgan ustun qo'shamiz, so'ng mavjud
-- yozuvlarni to'ldiramiz va shundan keyingina NOT NULL qilamiz.
-- Aks holda jadvalda yozuv bo'lsa migratsiya bajarilmaydi.
ALTER TABLE "wallet_transactions" ADD COLUMN "direction" "TransactionDirection";

-- Eski yozuvlarni to'ldirish.
--
-- TOP_UP, REFUND va BONUS — har doim kirim.
--
-- O'TKAZMALAR uchun turning o'zi yetarli emas. Ammo qabul qiluvchi
-- tomondagi yozuv har doim `-in` bilan tugaydigan kalit bilan yaratilgan
-- (`wallet.service.ts`), shuning uchun uni aniq ajratish mumkin. Aks holda
-- eski kelgan o'tkazmalar tarixda "chiqim" bo'lib qolib ketardi.
UPDATE "wallet_transactions"
SET "direction" = CASE
  WHEN "type" IN ('TOP_UP', 'REFUND', 'BONUS') THEN 'IN'::"TransactionDirection"
  WHEN "type" = 'TRANSFER' AND "idempotencyKey" LIKE '%-in' THEN 'IN'::"TransactionDirection"
  ELSE 'OUT'::"TransactionDirection"
END
WHERE "direction" IS NULL;

-- Endi ustun majburiy.
ALTER TABLE "wallet_transactions" ALTER COLUMN "direction" SET NOT NULL;
