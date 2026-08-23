-- Guruhga qo'shilish havolasi.
--
-- Havola ATAYLAB bo'sh boshlanadi: har bir guruhga avtomatik havola
-- yasash noto'g'ri bo'lardi. Uni administrator o'zi yoqadi.

ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "inviteCode" VARCHAR(16);
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "inviteCreatedAt" TIMESTAMP(3);

-- Kod YAGONA bo'lishi shart: ikkita guruh bir xil havolaga ega bo'lsa,
-- odam qaysisiga tushishi tasodifga bog'liq bo'lardi.
--
-- Bo'sh qiymatlar bir-biriga xalaqit bermaydi: Postgres yagonalik
-- tekshiruvida ularni e'tiborsiz qoldiradi.
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_inviteCode_key"
  ON "conversations"("inviteCode");
