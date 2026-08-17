-- CreateEnum
CREATE TYPE "CollabStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "collab_offers" (
    "id" UUID NOT NULL,
    "fromUserId" UUID NOT NULL,
    "toUserId" UUID NOT NULL,
    "subject" VARCHAR(120) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "status" "CollabStatus" NOT NULL DEFAULT 'PENDING',
    "conversationId" UUID,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collab_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collab_offers_toUserId_status_createdAt_idx" ON "collab_offers"("toUserId", "status", "createdAt");
CREATE INDEX "collab_offers_fromUserId_createdAt_idx" ON "collab_offers"("fromUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "collab_offers" ADD CONSTRAINT "collab_offers_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collab_offers" ADD CONSTRAINT "collab_offers_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- O'ZIGA taklif yuborib bo'lmaydi.
--
-- Kodda ham tekshiriladi, lekin bunday qator bazaga tushsa, u
-- ijodkorning qutisida abadiy turib qolardi va uni tushuntirib
-- bo'lmasdi.
ALTER TABLE "collab_offers" ADD CONSTRAINT "collab_offers_not_self" CHECK ("fromUserId" <> "toUserId");

-- Bitta juftlikda FAQAT BITTA javobsiz taklif.
--
-- ── Nima uchun bu shart ─────────────────────────────────────────────
-- Chegarasiz bo'lsa, bitta biznes ijodkorga o'nlab bir xil taklif
-- yuborib, uning qutisini to'ldirib tashlardi.
--
-- Shart QISMAN: javob berilgan takliflar tarix uchun qoladi va
-- ularning soni cheklanmaydi. Oddiy `UNIQUE` esa hammasini
-- qamrab olardi va ikkinchi marta hamkorlik qilishning iloji
-- qolmasdi.
CREATE UNIQUE INDEX "collab_offers_pending_pair_key"
  ON "collab_offers"("fromUserId", "toUserId")
  WHERE "status" = 'PENDING';
