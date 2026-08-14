
-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "productId" UUID,
ADD COLUMN     "videoPosterUrl" VARCHAR(500),
ADD COLUMN     "videoSeconds" INTEGER,
ADD COLUMN     "videoUrl" VARCHAR(500);

-- CreateIndex
CREATE INDEX "posts_videoUrl_createdAt_idx" ON "posts"("videoUrl", "createdAt");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

