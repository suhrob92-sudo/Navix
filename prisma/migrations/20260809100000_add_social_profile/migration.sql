-- Ijtimoiy profil: username, bio, joylashuv, sayt, tasdiqlangan belgisi
-- va kuzatuv (follow) jadvali.
--
-- ── Nima uchun bu migratsiya QO'LDA yozilgan ─────────────────────────
-- `username` ustuni bo'sh bo'la olmaydi (NOT NULL), lekin bazada
-- allaqachon foydalanuvchilar bor va ularda username yo'q. Avtomatik
-- yaratilgan migratsiya darhol xato berardi.
--
-- Shuning uchun uch qadam: avval bo'sh bo'lishi mumkin qilib
-- qo'shiladi, keyin mavjud qatorlar to'ldiriladi, keyingina NOT NULL
-- va yagonalik sharti qo'yiladi.

-- 1-qadam: ustunlarni qo'shamiz (username hozircha bo'sh bo'lishi mumkin).
ALTER TABLE "user_profiles"
  ADD COLUMN "username"   VARCHAR(30),
  ADD COLUMN "bio"        VARCHAR(300),
  ADD COLUMN "location"   VARCHAR(80),
  ADD COLUMN "website"    VARCHAR(200),
  ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- 2-qadam: mavjud foydalanuvchilarga vaqtinchalik nom beramiz.
--
-- Nom `id` dan olinadi: u yagona, shuning uchun natija ham yagona
-- bo'lishi kafolatlangan. Foydalanuvchi keyin uni o'zgartira oladi.
UPDATE "user_profiles"
SET "username" = 'user_' || SUBSTRING(REPLACE("id"::text, '-', ''), 1, 12)
WHERE "username" IS NULL;

-- 3-qadam: endi qoidalarni qo'yish xavfsiz.
ALTER TABLE "user_profiles" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "user_profiles_username_key" ON "user_profiles"("username");

-- Kuzatuv jadvali.
CREATE TABLE "follows" (
    "id" UUID NOT NULL,
    "followerId" UUID NOT NULL,
    "followingId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "follows_followingId_createdAt_idx" ON "follows"("followingId", "createdAt");

CREATE INDEX "follows_followerId_createdAt_idx" ON "follows"("followerId", "createdAt");

CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey"
  FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
