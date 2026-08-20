-- CreateEnum
CREATE TYPE "ModeratedContentKind" AS ENUM ('PRODUCT', 'DISH', 'POST', 'VACANCY');
CREATE TYPE "ContentRemovalReason" AS ENUM ('SPAM', 'ADULT', 'VIOLENCE', 'HATE', 'FRAUD', 'COPYRIGHT', 'MISLEADING', 'PRIVACY', 'OTHER');

-- CreateTable
CREATE TABLE "content_removals" (
    "id" UUID NOT NULL,
    "kind" "ModeratedContentKind" NOT NULL,
    "contentId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "reason" "ContentRemovalReason" NOT NULL,
    "note" VARCHAR(200),
    "moderatorId" UUID,
    "restoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_removals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_removals_ownerId_createdAt_idx" ON "content_removals"("ownerId", "createdAt");
CREATE INDEX "content_removals_kind_contentId_restoredAt_idx" ON "content_removals"("kind", "contentId", "restoredAt");

-- AddForeignKey
ALTER TABLE "content_removals" ADD CONSTRAINT "content_removals_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_removals" ADD CONSTRAINT "content_removals_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Bitta yozuvda BIR VAQTDA bitta ochiq sabab.
--
-- ── Nima uchun QISMAN indeks ────────────────────────────────────────
-- Oddiy noyob indeks tarixni ham qamrab olardi: yozuv olib
-- tashlanib, qaytarilib, yana olib tashlansa — ikkinchi qator
-- yozilmasdi va muallif eski sababni ko'rib turaverardi.
--
-- Shart faqat OCHIQ qatorlarga qo'yiladi: tarix cheksiz o'sadi,
-- ochig'i esa har doim bitta.
CREATE UNIQUE INDEX "content_removals_active_unique"
    ON "content_removals"("kind", "contentId")
    WHERE "restoredAt" IS NULL;
