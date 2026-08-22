-- Guruh qo'ng'iroqlari.
--
-- Ikki kishilik qo'ng'iroqlar O'ZGARISHSIZ qoladi: ular baribir
-- `callerId` va `calleeId` ustunlarida ishlaydi. Guruh esa alohida
-- ishtirokchilar jadvalidan foydalanadi.

-- 1) "Kimga" ustuni endi bo'sh bo'lishi mumkin (guruhda aniq "kim" yo'q).
ALTER TABLE "calls" ALTER COLUMN "calleeId" DROP NOT NULL;

-- 2) Guruh bayrog'i.
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "isGroup" BOOLEAN NOT NULL DEFAULT false;

-- 3) Ishtirokchi holati.
DO $$
BEGIN
  CREATE TYPE "CallParticipantStatus" AS ENUM ('INVITED', 'JOINED', 'LEFT', 'DECLINED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 4) Ishtirokchilar jadvali.
CREATE TABLE IF NOT EXISTS "call_participants" (
  "id"        UUID NOT NULL,
  "callId"    UUID NOT NULL,
  "userId"    UUID NOT NULL,
  "status"    "CallParticipantStatus" NOT NULL DEFAULT 'INVITED',
  "joinedAt"  TIMESTAMP(3),
  "leftAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "call_participants_pkey" PRIMARY KEY ("id")
);

-- Bir odam bitta qo'ng'iroqda BITTA marta.
CREATE UNIQUE INDEX IF NOT EXISTS "call_participants_callId_userId_key"
  ON "call_participants"("callId", "userId");

-- "Bu odam hozir qaysi suhbatda" — indekssiz butun jadval o'qilardi.
CREATE INDEX IF NOT EXISTS "call_participants_userId_status_idx"
  ON "call_participants"("userId", "status");

ALTER TABLE "call_participants"
  DROP CONSTRAINT IF EXISTS "call_participants_callId_fkey";
ALTER TABLE "call_participants"
  ADD CONSTRAINT "call_participants_callId_fkey"
  FOREIGN KEY ("callId") REFERENCES "calls"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "call_participants"
  DROP CONSTRAINT IF EXISTS "call_participants_userId_fkey";
ALTER TABLE "call_participants"
  ADD CONSTRAINT "call_participants_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Bir odam bir vaqtda FAQAT BITTA guruh suhbatida bo'ladi.
--
-- Ikki kishilik qo'ng'iroqda bu `calls_one_live_per_callee` indeksi
-- bilan ta'minlanadi. Guruhda esa ishtirokchi boshqa jadvalda,
-- shuning uchun unga alohida shart kerak.
--
-- Shart FAQAT "suhbatda" holatiga tegishli: tugagan suhbatlar tarixda
-- istalgancha bo'lishi mumkin.
CREATE UNIQUE INDEX IF NOT EXISTS "call_participants_one_live_per_user"
  ON "call_participants"("userId")
  WHERE "status" = 'JOINED';
