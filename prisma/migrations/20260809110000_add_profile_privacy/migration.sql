-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "MessagePrivacy" AS ENUM ('EVERYONE', 'FOLLOWERS', 'NOBODY');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "gender" "Gender",
ADD COLUMN     "messagePrivacy" "MessagePrivacy" NOT NULL DEFAULT 'EVERYONE';

