-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'FRAUD', 'IMPERSONATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" UUID NOT NULL,
    "blockerId" UUID NOT NULL,
    "blockedId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reports" (
    "id" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "note" VARCHAR(500),
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_blocks_blockedId_idx" ON "user_blocks"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key" ON "user_blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "user_reports_status_createdAt_idx" ON "user_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "user_reports_targetId_idx" ON "user_reports"("targetId");

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Bitta odam ustidan bitta OCHIQ shikoyat ────────────────────────────
--
-- Shikoyat tugmasi qayta-qayta bosilsa, moderator ro'yxati bir xil
-- yozuvlar bilan to'lib ketardi va haqiqiy shikoyatlar orasida
-- yo'qolardi.
--
-- Shart FAQAT ochiq shikoyatlarga tegishli: ko'rib chiqilgandan keyin
-- odam qaytadan shikoyat qila oladi (yangi holat yuzaga kelgan
-- bo'lishi mumkin).
CREATE UNIQUE INDEX "user_reports_one_open_per_pair"
  ON "user_reports"("reporterId", "targetId")
  WHERE "status" = 'OPEN';

-- ── O'zini bloklash yoki o'ziga shikoyat qilish MUMKIN EMAS ────────────
--
-- Kodda tekshiruv bor, lekin baza ham himoyalanishi kerak: bunday
-- yozuv paydo bo'lsa, u hech qachon to'g'ri ishlamaydigan holat
-- yaratardi (odam o'zi bilan yozisha olmay qolardi).
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_not_self"
  CHECK ("blockerId" <> "blockedId");

ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_not_self"
  CHECK ("reporterId" <> "targetId");
