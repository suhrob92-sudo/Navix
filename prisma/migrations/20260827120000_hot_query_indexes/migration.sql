-- Ko'p ishlatiladigan so'rovlar uchun indekslar.
--
-- ── Nima uchun kerak (o'lchov bilan) ─────────────────────────────────
-- Baza kichik bo'lganda hamma narsa tez ko'rinadi. Shuning uchun
-- tekshiruv HAQIQIY hajmda o'tkazildi: 300 000 bildirishnoma va
-- 500 000 audit yozuvi bilan nusxa jadval yasalib, aynan ilova
-- yuboradigan so'rovlar o'lchandi.
--
-- 1) BILDIRISHNOMALAR
--
-- Ilova har ochilganda uchta so'rov ketadi: ro'yxat, jami soni va
-- o'qilmaganlar soni. Ularning hammasi `("userId", channel)` bo'yicha
-- filtrlaydi va `createdAt` bo'yicha tartiblaydi.
--
-- Eski indeks esa `("userId", status)` edi — `status` bu YETKAZISH
-- holati (navbatda/yuborildi), so'rovda umuman ishlatilmaydi. Ya'ni
-- indeks bor edi, lekin so'rovga mos emasdi: baza foydalanuvchining
-- BARCHA bildirishnomalarini o'qib, keyin saralardi.
--
-- O'lchov (bitta odamda 5000 bildirishnoma):
--   jami sanash        12.5 ms  ->  1.2 ms
--   o'qilmaganlar      14.4 ms  ->  0.7 ms
--   10-sahifa           3.0 ms  ->  0.3 ms
CREATE INDEX "notifications_userId_channel_createdAt_idx"
  ON "notifications" ("userId", "channel", "createdAt" DESC);

-- O'qilmaganlar uchun QISMAN indeks.
--
-- Nima uchun alohida: o'qilmagan bildirishnomalar odatda umumiy
-- sonning to'rtdan biri. Qisman indeks faqat ularni saqlaydi, ya'ni
-- kichik bo'ladi va "hammasini o'qilgan qilish" ham shu indeksdan
-- foydalanadi.
--
-- Prisma sxemasida yozib bo'lmaydi (qisman indeksni qo'llab-quvvatlamaydi),
-- shuning uchun u faqat shu migratsiyada yashaydi.
CREATE INDEX "notifications_unread_idx"
  ON "notifications" ("userId", "channel", "createdAt" DESC)
  WHERE "readAt" IS NULL;

-- Eski indekslar OLIB TASHLANADI.
--
-- Ikkalasi ham hech qaysi so'rovga mos kelmaydi (kod tekshirildi:
-- barcha bildirishnoma so'rovlari `notification.service.ts` da va
-- hammasi `userId` + `channel` bo'yicha filtrlaydi).
--
-- Keraksiz indeks bepul emas: har bir YANGI bildirishnoma yozilganda
-- u ham yangilanadi. Bildirishnoma esa juda tez-tez yoziladi.
DROP INDEX "notifications_userId_status_idx";
DROP INDEX "notifications_createdAt_idx";

-- 2) AUDIT JURNALI
--
-- Admin panelidagi jurnal sanaga qarab tartiblanadi, lekin `createdAt`
-- bo'yicha indeks yo'q edi — faqat `("actorId", createdAt)` bor edi va
-- u odam tanlanmaganda ishlamaydi.
--
-- Natijada har ochilishda BUTUN jadval o'qilardi. Audit jurnali esa
-- to'xtovsiz o'sadi: u hech qachon tozalanmaydi (ataylab — bu
-- moliyaviy va xavfsizlik dalili).
--
-- O'lchov (500 000 yozuv):  49 ms  ->  0.09 ms
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs" ("createdAt" DESC);
