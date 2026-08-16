-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "placeName" VARCHAR(120);

-- CreateIndex
CREATE INDEX "posts_latitude_longitude_idx" ON "posts"("latitude", "longitude");

