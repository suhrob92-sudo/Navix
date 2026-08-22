-- Guruh suhbatlari.
--
-- Uch qism: suhbat turiga GROUP qo'shiladi, guruhga nom/rasm/yaratuvchi
-- beriladi, a'zoga daraja beriladi va xabarga hodisa turi qo'shiladi.

-- 1) Yangi suhbat turi.
ALTER TYPE "ConversationKind" ADD VALUE IF NOT EXISTS 'GROUP';

-- 2) Guruhdagi daraja.
DO $$
BEGIN
  CREATE TYPE "GroupRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 3) Guruhdagi hodisa turi.
DO $$
BEGIN
  CREATE TYPE "SystemMessageKind" AS ENUM (
    'GROUP_CREATED',
    'MEMBER_ADDED',
    'MEMBER_REMOVED',
    'MEMBER_LEFT',
    'TITLE_CHANGED',
    'IMAGE_CHANGED',
    'ADMIN_GRANTED',
    'ADMIN_REVOKED',
    'OWNER_CHANGED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 4) Guruh ma'lumotlari.
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "title" VARCHAR(60);
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR(500);
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "createdById" UUID;

-- Yaratuvchi hisobini o'chirsa, guruh qolgan a'zolar uchun yashab qoladi.
ALTER TABLE "conversations"
  DROP CONSTRAINT IF EXISTS "conversations_createdById_fkey";
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Hisob o'chirilganda u yaratgan guruhlar shu indeks orqali topiladi.
CREATE INDEX IF NOT EXISTS "conversations_createdById_idx" ON "conversations"("createdById");

-- 5) A'zoning darajasi. Mavjud suhbatlarda hamma oddiy a'zo bo'lib qoladi.
ALTER TABLE "conversation_members"
  ADD COLUMN IF NOT EXISTS "role" "GroupRole" NOT NULL DEFAULT 'MEMBER';

-- 6) Hodisa xabarlari. Oddiy xabarda bo'sh.
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "systemKind" "SystemMessageKind";
