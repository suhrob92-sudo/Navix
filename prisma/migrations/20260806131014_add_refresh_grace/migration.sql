-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "previousTokenHash" VARCHAR(255),
ADD COLUMN     "rotatedAt" TIMESTAMP(3);
