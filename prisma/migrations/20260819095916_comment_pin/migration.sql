-- AlterTable
ALTER TABLE "post_comments" ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "post_comments_postId_likeCount_idx" ON "post_comments"("postId", "likeCount");

-- CreateIndex
CREATE INDEX "post_comments_postId_pinnedAt_idx" ON "post_comments"("postId", "pinnedAt");
