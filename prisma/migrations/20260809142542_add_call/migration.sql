-- CreateEnum
CREATE TYPE "CallKind" AS ENUM ('AUDIO', 'VIDEO');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ACTIVE', 'DECLINED', 'MISSED', 'ENDED', 'FAILED');

-- CreateTable
CREATE TABLE "calls" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "callerId" UUID NOT NULL,
    "calleeId" UUID NOT NULL,
    "kind" "CallKind" NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calls_conversationId_startedAt_idx" ON "calls"("conversationId", "startedAt");

-- CreateIndex
CREATE INDEX "calls_calleeId_status_idx" ON "calls"("calleeId", "status");

-- CreateIndex
CREATE INDEX "calls_callerId_status_idx" ON "calls"("callerId", "status");

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_calleeId_fkey" FOREIGN KEY ("calleeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Bir odamda bir vaqtda BITTA jonli qo'ng'iroq ────────────────────────
--
-- Tugma ikki marta bosilsa yoki ikkita qurilmadan bir vaqtda bosilsa,
-- ikkita qo'ng'iroq yozuvi yaratilib qolishi mumkin. Unda telefon ikki
-- marta chalinardi va qaysi biri tugatilgani noaniq bo'lardi.
--
-- Kodda tekshiruv bor, lekin u YETARLI EMAS: o'qish va yozish orasida
-- vaqt bor. Yagona ishonchli to'siq — bazadagi shart.
--
-- Shart FAQAT jonli qo'ng'iroqlarga tegishli (`WHERE`): tugagan
-- qo'ng'iroqlar tarixda istalgancha bo'lishi mumkin.
--
-- Bu "band" holatini (A gaplashayotganda C qo'ng'iroq qilishi)
-- QAMRAMAYDI — u kodda tekshiriladi va "band" javobi qaytariladi.
CREATE UNIQUE INDEX "calls_one_live_per_caller"
  ON "calls"("callerId")
  WHERE "status" IN ('RINGING', 'ACTIVE');

CREATE UNIQUE INDEX "calls_one_live_per_callee"
  ON "calls"("calleeId")
  WHERE "status" IN ('RINGING', 'ACTIVE');
