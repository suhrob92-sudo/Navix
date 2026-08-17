-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "telegramHandle" VARCHAR(32),
ADD COLUMN     "instagramHandle" VARCHAR(32),
ADD COLUMN     "youtubeHandle" VARCHAR(32),
ADD COLUMN     "isOpenToCollab" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "collabNote" VARCHAR(200);

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "posts_authorId_pinnedAt_idx" ON "posts"("authorId", "pinnedAt");
