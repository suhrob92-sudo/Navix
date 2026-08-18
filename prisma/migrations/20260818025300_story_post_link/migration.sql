-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "postId" UUID;

-- CreateIndex
CREATE INDEX "stories_postId_idx" ON "stories"("postId");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
