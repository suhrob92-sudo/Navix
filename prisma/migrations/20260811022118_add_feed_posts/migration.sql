-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt");

-- CreateIndex
CREATE INDEX "posts_authorId_createdAt_idx" ON "posts"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "post_likes_userId_idx" ON "post_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_postId_userId_key" ON "post_likes"("postId", "userId");

-- CreateIndex
CREATE INDEX "post_comments_postId_createdAt_idx" ON "post_comments"("postId", "createdAt");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Qo'lda qo'shilgan shartlar (Prisma sxemasi bularni ifodalay olmaydi).

-- Sonlar hech qachon manfiy bo'lmasligi kerak.
--
-- Ular tranzaksiya ichida `decrement` bilan kamaytiriladi. Kodda xato
-- bo'lsa (masalan yoqtirish ikki marta o'chirilsa) son -1 ga tushib
-- ketardi va buni HECH KIM sezmasdi. Baza esa darhol to'xtatadi.
ALTER TABLE "posts" ADD CONSTRAINT "posts_like_count_not_negative" CHECK ("likeCount" >= 0);
ALTER TABLE "posts" ADD CONSTRAINT "posts_comment_count_not_negative" CHECK ("commentCount" >= 0);

-- Bo'sh post va bo'sh izoh bo'lmaydi.
--
-- Tekshiruv Zod'da ham bor, lekin u faqat HTTP orqali kelgan
-- ma'lumotni ushlaydi. Skript yoki kelajakdagi boshqa kirish nuqtasi
-- bazaga to'g'ridan-to'g'ri yozsa, bo'sh post lentada ko'rinib qolardi.
ALTER TABLE "posts" ADD CONSTRAINT "posts_body_not_blank" CHECK (btrim("body") <> '');
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_body_not_blank" CHECK (btrim("body") <> '');

-- Lentaning ASOSIY so'rovi uchun qisman indeks.
--
-- Lenta har doim "o'chirilmagan postlar, yangisidan eskisiga" tartibida
-- o'qiladi. Oddiy indeks o'chirilganlarni ham saqlaydi; qisman indeks
-- esa kichikroq bo'ladi va yillar o'tib o'chirilgan postlar ko'paysa
-- ham tezligini yo'qotmaydi.
CREATE INDEX "posts_live_created_idx" ON "posts"("createdAt" DESC, "id" DESC) WHERE "deletedAt" IS NULL;
