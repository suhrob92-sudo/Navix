-- AlterTable
ALTER TABLE "post_saves" ADD COLUMN     "collectionId" UUID;

-- CreateTable
CREATE TABLE "post_collections" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_collections_ownerId_createdAt_idx" ON "post_collections"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "post_collections_ownerId_name_key" ON "post_collections"("ownerId", "name");

-- CreateIndex
CREATE INDEX "post_saves_userId_collectionId_createdAt_idx" ON "post_saves"("userId", "collectionId", "createdAt");

-- AddForeignKey
ALTER TABLE "post_saves" ADD CONSTRAINT "post_saves_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "post_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_collections" ADD CONSTRAINT "post_collections_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
