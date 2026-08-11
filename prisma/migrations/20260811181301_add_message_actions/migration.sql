-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "replyToId" UUID;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "chatWallpaper" VARCHAR(20) NOT NULL DEFAULT 'DEFAULT';

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Qo'lda qo'shilgan shartlar (Prisma sxemasi bularni ifodalay olmaydi).

-- Xabar O'ZIGA javob bera olmaydi.
--
-- Kodda bunday bo'lishi mumkin emas (javob berilayotgan xabar
-- allaqachon mavjud), lekin baza darajasidagi shart bu holatni
-- butunlay imkonsiz qiladi — masalan kelajakdagi ko'chirish
-- skriptlarida.
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_not_self" CHECK ("replyToId" <> "id");

-- Tahrirlash vaqti yaratilish vaqtidan oldin bo'lishi mumkin emas.
ALTER TABLE "messages" ADD CONSTRAINT "messages_edited_after_created"
  CHECK ("editedAt" IS NULL OR "editedAt" >= "createdAt");

-- Javoblarni tez topish uchun (masalan "bu xabarga nechta javob bor").
CREATE INDEX "messages_reply_idx" ON "messages"("replyToId") WHERE "replyToId" IS NOT NULL;
