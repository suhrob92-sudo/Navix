-- O'chirilgan post shartdan CHIQARILADI.
--
-- ── Muammo ──────────────────────────────────────────────────────────────
-- "matn YOKI rasm bo'lsin" sharti o'chirish amalini to'xtatib qo'ydi:
-- matnsiz, faqat rasmli post o'chirilganda rasm manzili tozalanadi va
-- qator shartga to'g'ri kelmay qoladi. Natijada post umuman
-- o'chirilmasdi.
--
-- ── Yechim ──────────────────────────────────────────────────────────────
-- Shartning maqsadi — "TIRIK post bo'sh bo'lmasin". O'chirilgan postda
-- esa ko'rsatiladigan narsa umuman bo'lmasligi kerak. Shuning uchun
-- shart faqat tirik postlarga qo'llanadi.
ALTER TABLE "posts" DROP CONSTRAINT "posts_body_or_image";
ALTER TABLE "posts" ADD CONSTRAINT "posts_body_or_image"
  CHECK ("deletedAt" IS NOT NULL OR btrim("body") <> '' OR "imageUrl" IS NOT NULL);

-- Xabar uchun ham xuddi shunday: o'chirilgan xabar matni ham
-- ko'rsatilmaydi.
ALTER TABLE "messages" DROP CONSTRAINT "messages_body_or_image";
ALTER TABLE "messages" ADD CONSTRAINT "messages_body_or_image"
  CHECK ("deletedAt" IS NOT NULL OR btrim("body") <> '' OR "imageUrl" IS NOT NULL);
