-- ---------------------------------------------------------------------
-- Bandlovda QAYTARILGAN summa
--
-- ── Nima uchun kerak bo'ldi ──────────────────────────────────────────
-- Bekor qilishda pul har doim to'liq qaytardi, shuning uchun uni
-- alohida yozishning hojati yo'q edi: u har doim `totalTiyin` ga
-- teng bo'lardi.
--
-- 50-bosqichdan boshlab qaytariladigan ulush kirish kunigacha
-- qolgan vaqtga bog'liq. Endi "qancha qaytdi" degan savolga
-- javob faqat SHU USTUNDA turadi — uni qayta hisoblab bo'lmaydi,
-- chunki hisob bekor qilingan KUNGA bog'liq va u vaqt o'tishi
-- bilan boshqacha chiqadi.
-- ---------------------------------------------------------------------

ALTER TABLE "hotel_bookings" ADD COLUMN "refundTiyin" BIGINT;

-- Qaytarilgan summa bandlov summasidan oshmasligi kerak.
ALTER TABLE "hotel_bookings"
  ADD CONSTRAINT "hotel_bookings_refund_not_over" CHECK (
    "refundTiyin" IS NULL OR ("refundTiyin" >= 0 AND "refundTiyin" <= "totalTiyin")
  );

-- ── Eski bandlovlar ─────────────────────────────────────────────────
-- Ular 50-bosqichgacha bekor qilingan va o'shanda pul TO'LIQ
-- qaytgan. Bu taxmin emas — o'sha paytdagi kodda boshqa yo'l
-- umuman yo'q edi.
UPDATE "hotel_bookings"
SET "refundTiyin" = "totalTiyin"
WHERE "status" = 'CANCELLED';
