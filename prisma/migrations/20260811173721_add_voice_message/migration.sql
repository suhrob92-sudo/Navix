-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "voiceSeconds" INTEGER,
ADD COLUMN     "voiceUrl" VARCHAR(500);

-- Qo'lda qo'shilgan shartlar (Prisma sxemasi bularni ifodalay olmaydi).

-- Endi xabar OVOZ bilan ham bo'lishi mumkin.
--
-- Eski shart "matn yoki rasm bo'lsin" deb turardi va matnsiz ovozli
-- xabarni o'tkazmasdi.
ALTER TABLE "messages" DROP CONSTRAINT "messages_body_or_image";
ALTER TABLE "messages" ADD CONSTRAINT "messages_has_content"
  CHECK (
    "deletedAt" IS NOT NULL
    OR btrim("body") <> ''
    OR "imageUrl" IS NOT NULL
    OR "voiceUrl" IS NOT NULL
  );

-- Ovoz va uning davomiyligi BIRGA bo'ladi.
--
-- ── Nima uchun bu shart kerak ─────────────────────────────────────────
-- Davomiyliksiz ovozli xabar ekranda "0:00" bo'lib turardi va odam uni
-- buzilgan deb o'ylardi. Davomiylik bo'lib, ovoz bo'lmasa esa bo'sh
-- o'yinchi qoladi.
ALTER TABLE "messages" ADD CONSTRAINT "messages_voice_pair"
  CHECK (("voiceUrl" IS NULL) = ("voiceSeconds" IS NULL));

-- Davomiylik mantiqiy chegarada bo'lishi kerak (0 dan 2 daqiqagacha).
ALTER TABLE "messages" ADD CONSTRAINT "messages_voice_seconds_range"
  CHECK ("voiceSeconds" IS NULL OR ("voiceSeconds" > 0 AND "voiceSeconds" <= 120));
