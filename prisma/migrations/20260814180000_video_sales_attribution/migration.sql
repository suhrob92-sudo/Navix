-- AlterTable
ALTER TABLE "market_order_items" ADD COLUMN     "sourcePostId" UUID;

-- CreateTable
CREATE TABLE "post_product_clicks" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_product_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_product_clicks_userId_productId_clickedAt_idx" ON "post_product_clicks"("userId", "productId", "clickedAt");

-- CreateIndex
CREATE INDEX "post_product_clicks_postId_idx" ON "post_product_clicks"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "post_product_clicks_userId_productId_key" ON "post_product_clicks"("userId", "productId");

-- CreateIndex
CREATE INDEX "market_order_items_sourcePostId_idx" ON "market_order_items"("sourcePostId");

-- AddForeignKey
ALTER TABLE "market_order_items" ADD CONSTRAINT "market_order_items_sourcePostId_fkey" FOREIGN KEY ("sourcePostId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_product_clicks" ADD CONSTRAINT "post_product_clicks_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_product_clicks" ADD CONSTRAINT "post_product_clicks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

