-- Taklif tizimi.
--
-- ── Nima qo'shiladi ─────────────────────────────────────────────────
--   referralCode  — shaxsiy kod ("ACDE234"), birinchi kerak
--                   bo'lganda yasaladi;
--   referredById  — bu odamni kim taklif qilgani;
--   referredAt    — qachon kelgani.
--
-- ── Nima uchun `SetNull` ────────────────────────────────────────────
-- Taklif qilgan odam hisobini o'chirsa, taklif qilingan odam
-- hisobi qolishi kerak — u mustaqil foydalanuvchi.

ALTER TABLE "users" ADD COLUMN "referralCode" VARCHAR(12);
ALTER TABLE "users" ADD COLUMN "referredById" UUID;
ALTER TABLE "users" ADD COLUMN "referredAt" TIMESTAMP(3);

-- Kod NOYOB.
--
-- Kod tasodifiy yasaladi va nazariy jihatdan to'qnashishi mumkin.
-- Bazadagi shart buni ushlaydi — kod yasovchi esa yangisini
-- yasab qayta uriniladi.
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- "Men kimlarni taklif qilganman" — ro'yxat shu bo'yicha o'qiladi.
-- Indekssiz u butun jadvalni o'qirdi.
CREATE INDEX "users_referredById_createdAt_idx" ON "users"("referredById", "createdAt");

ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- O'ZINI o'zi taklif qila olmaydi.
--
-- Kodda ham tekshiriladi, lekin bunday qator bazaga tushib qolsa,
-- statistika abadiy noto'g'ri bo'lardi va uni tuzatish qiyin edi.
ALTER TABLE "users" ADD CONSTRAINT "users_referral_not_self" CHECK ("referredById" IS NULL OR "referredById" <> "id");
