-- CreateTable
CREATE TABLE "message_reactions" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_reactions_messageId_idx" ON "message_reactions"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_messageId_userId_key" ON "message_reactions"("messageId", "userId");

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Qo'lda qo'shilgan shart (Prisma sxemasi buni ifodalay olmaydi).

-- Bo'sh reaksiya bo'lishi mumkin emas.
--
-- Kodda bunday bo'lmaydi (emoji ro'yxatdan tekshiriladi), lekin baza
-- darajasidagi shart kelajakdagi ko'chirish skriptlari yoki qo'lda
-- yozilgan SQL uchun ham amal qiladi. Bo'sh reaksiya esa ekranda
-- ko'rinmas nishon bo'lib turardi — uni bosib ham bo'lmasdi.
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_emoji_not_empty"
  CHECK (btrim("emoji") <> '');
