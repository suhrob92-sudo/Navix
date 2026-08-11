-- CreateEnum
CREATE TYPE "ErrorSource" AS ENUM ('SERVER', 'BROWSER');

-- CreateTable
CREATE TABLE "error_logs" (
    "id" UUID NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "source" "ErrorSource" NOT NULL,
    "kind" VARCHAR(120) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "path" VARCHAR(300) NOT NULL,
    "method" VARCHAR(10),
    "stack" VARCHAR(4000),
    "count" INTEGER NOT NULL DEFAULT 1,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "version" VARCHAR(40),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "error_logs_fingerprint_key" ON "error_logs"("fingerprint");

-- CreateIndex
CREATE INDEX "error_logs_isResolved_lastSeenAt_idx" ON "error_logs"("isResolved", "lastSeenAt");

-- CreateIndex
CREATE INDEX "error_logs_lastSeenAt_idx" ON "error_logs"("lastSeenAt");

-- Qo'lda qo'shilgan shartlar (Prisma sxemasi bularni ifodalay olmaydi).

-- Takrorlanish soni manfiy bo'lib qolmaydi.
--
-- U `increment` bilan oshiriladi. Kodda xato bo'lsa son buzilardi va
-- buni hech kim sezmasdi — jadval esa aynan shu son bo'yicha
-- tartiblanadi.
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_count_positive" CHECK ("count" > 0);

-- "Oxirgi ko'rilgan" birinchisidan oldin bo'lishi mumkin emas.
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_seen_order" CHECK ("lastSeenAt" >= "firstSeenAt");
