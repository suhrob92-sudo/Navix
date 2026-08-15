-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('DISCOUNTS', 'RESTAURANTS', 'MARKETPLACE', 'JOBS', 'DELIVERY', 'LISTINGS', 'TRAVEL', 'EDUCATION', 'CREATORS');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "category" "PostCategory";

-- CreateIndex
CREATE INDEX "posts_category_createdAt_idx" ON "posts"("category", "createdAt");

