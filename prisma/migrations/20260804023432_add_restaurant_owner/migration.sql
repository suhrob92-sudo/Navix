-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "ownerId" UUID;

-- CreateIndex
CREATE INDEX "restaurants_ownerId_idx" ON "restaurants"("ownerId");

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
