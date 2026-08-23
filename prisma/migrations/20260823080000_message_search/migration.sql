-- Xabarlarni qidirish uchun indeks.
--
-- ── Muammo ───────────────────────────────────────────────────────────
-- "Ichida bormi" qidiruvi (ILIKE '%soz%') oddiy indeksdan
-- FOYDALANA OLMAYDI: indeks so'zning boshiga qarab tuzilgan, qidiruv
-- esa o'rtasidan izlaydi.
--
-- Natijada butun jadval o'qiladi. Xabarlar jadvali esa eng tez
-- o'sadigan jadval — bugun tez ishlaydigan qidiruv bir yildan keyin
-- saytni to'xtatib qo'yardi.
--
-- ── Yechim: uch harfli bo'laklar (trigram) ───────────────────────────
-- `pg_trgm` matnni uch harfli bo'laklarga ajratadi va ular bo'yicha
-- indeks tuzadi: "salom" -> "sal", "alo", "lom". Qidiruv ham shunday
-- ajratiladi va indeks ishlaydi.
--
-- ── Nima uchun XATO YUTILADI ─────────────────────────────────────────
-- Kengaytmani o'rnatish uchun bazada maxsus huquq kerak. Ba'zi
-- xizmatlarda u yo'q.
--
-- Agar shu qator xatoga uchrasa, BUTUN ko'chirish to'xtardi va sayt
-- umuman chiqmasdi — holbuki qidiruvning o'zi indekssiz ham
-- ISHLAYDI, faqat sekinroq.
--
-- Shuning uchun xato ushlanadi va ogohlantirish sifatida yoziladi.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN insufficient_privilege OR undefined_file THEN
    RAISE WARNING 'pg_trgm o''rnatilmadi — qidiruv indekssiz ishlaydi';
END
$$;

-- Indeks faqat kengaytma bor bo'lsa yaratiladi.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS "messages_body_trgm_idx"
      ON "messages" USING GIN ("body" gin_trgm_ops);
  END IF;
END
$$;
