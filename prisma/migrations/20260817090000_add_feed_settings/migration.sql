-- CreateEnum
CREATE TYPE "AudienceScope" AS ENUM ('EVERYONE', 'FOLLOWERS', 'NOBODY');

-- CreateTable
CREATE TABLE "feed_settings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "interests" "PostCategory"[],
    "notInterested" "PostCategory"[],
    "sensitiveFilter" BOOLEAN NOT NULL DEFAULT true,
    "profileVisibility" "AudienceScope" NOT NULL DEFAULT 'EVERYONE',
    "commentScope" "AudienceScope" NOT NULL DEFAULT 'EVERYONE',
    "followScope" "AudienceScope" NOT NULL DEFAULT 'EVERYONE',
    "notifyLike" BOOLEAN NOT NULL DEFAULT true,
    "notifyComment" BOOLEAN NOT NULL DEFAULT true,
    "notifyFollow" BOOLEAN NOT NULL DEFAULT true,
    "notifyMention" BOOLEAN NOT NULL DEFAULT true,
    "notifyLive" BOOLEAN NOT NULL DEFAULT true,
    "recommendationsResetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feed_settings_userId_key" ON "feed_settings"("userId");

-- AddForeignKey
ALTER TABLE "feed_settings" ADD CONSTRAINT "feed_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

