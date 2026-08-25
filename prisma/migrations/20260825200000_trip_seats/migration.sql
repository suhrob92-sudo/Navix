-- ---------------------------------------------------------------------
-- Chiptadagi O'RIN raqamlari
--
-- ── Nima uchun alohida jadval ────────────────────────────────────────
-- O'rin raqamlarini `trip_bookings` ga massiv ustun qilib qo'shish
-- mumkin edi va kod soddaroq bo'lardi.
--
-- Lekin o'shanda eng muhim kafolat YO'QOLARDI: ikki kishi bir vaqtda
-- bitta o'rinni tanlashi mumkin emasligi. Massiv ustunga bunday
-- shart qo'yib bo'lmaydi — uni faqat kod tekshirardi va ikkita
-- so'rov bir vaqtda kelganda ikkalasi ham o'tib ketardi.
--
-- Alohida jadvalda esa bu BAZA darajasida kafolatlanadi: reys +
-- sana + o'rin uchligi UNIQUE. Ikkinchi so'rov shunchaki xato
-- oladi va o'rin ikki marta sotilmaydi.
-- ---------------------------------------------------------------------

CREATE TABLE "trip_seats" (
    "id"         UUID NOT NULL,
    "bookingId"  UUID NOT NULL,
    "scheduleId" UUID NOT NULL,
    -- Jo'nash sanasi — bo'shlik AYNAN shu kun uchun hisoblanadi.
    "departDate" DATE NOT NULL,
    -- "12A" yoki "24".
    "seatNumber" VARCHAR(6) NOT NULL,
    -- O'rin BO'SHATILGAN payt (chipta bekor qilinganda).
    --
    -- ── Nima uchun qator O'CHIRILMAYDI ────────────────────────────
    -- Bekor qilingan chiptada ham "qaysi o'rin edi" degan ma'lumot
    -- qoladi: yo'lovchi bilan bahs chiqsa, javob shu yerda.
    --
    -- O'chirish tarixni yo'q qilardi.
    "releasedAt" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_seats_pkey" PRIMARY KEY ("id")
);

-- ── ENG MUHIM SHART ─────────────────────────────────────────────────
-- Bitta reysda, bitta kunda, bitta o'rin — FAQAT BIR MARTA.
--
-- ── Nima uchun QISMAN (partial) indeks ──────────────────────────────
-- Oddiy yagona indeks bekor qilingan chiptaning o'rnini ham band
-- qilib turardi: yo'lovchi chiptasini qaytargandan keyin o'sha
-- o'rinni HECH KIM sotib ololmasdi.
--
-- `WHERE "releasedAt" IS NULL` sharti bilan esa faqat AMALDAGI
-- o'rinlar hisobga olinadi va bo'shagan o'rin darhol sotuvga
-- qaytadi.
CREATE UNIQUE INDEX "trip_seats_unique"
  ON "trip_seats" ("scheduleId", "departDate", "seatNumber")
  WHERE "releasedAt" IS NULL;

-- Reys + sana bo'yicha xaritani o'qish.
CREATE INDEX "trip_seats_scheduleId_departDate_seatNumber_idx"
  ON "trip_seats" ("scheduleId", "departDate", "seatNumber");

-- Chiptadagi o'rinlarni o'qish.
CREATE INDEX "trip_seats_bookingId_idx" ON "trip_seats" ("bookingId");

ALTER TABLE "trip_seats"
  ADD CONSTRAINT "trip_seats_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "trip_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trip_seats"
  ADD CONSTRAINT "trip_seats_scheduleId_fkey"
  FOREIGN KEY ("scheduleId") REFERENCES "trip_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- ── Eski chiptalar TO'LDIRILMAYDI ───────────────────────────────────
--
-- Ularda faqat o'rinlar SONI yozilgan. Qaysi o'rin ekani hech
-- qayerda saqlanmagan va uni tiklashning iloji yo'q.
--
-- Tasodifiy o'rin biriktirish mumkin edi va xarita to'laroq
-- ko'rinardi. Lekin o'shanda odam aslida bo'sh o'rinni tanlay
-- olmay qolardi — ya'ni yolg'on ma'lumot haqiqiy zarar berardi.
--
-- Buning o'rniga ekranda ochiq aytiladi: "yana N ta o'rin band,
-- lekin qaysi biri ekani ma'lum emas".
-- ---------------------------------------------------------------------
