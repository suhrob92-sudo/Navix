-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "editedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_reports" ADD COLUMN     "commentId" UUID,
ADD COLUMN     "postId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "user_reports_reporterId_postId_key" ON "user_reports"("reporterId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "user_reports_reporterId_commentId_key" ON "user_reports"("reporterId", "commentId");

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

