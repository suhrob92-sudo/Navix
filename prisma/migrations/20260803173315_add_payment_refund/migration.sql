-- AlterTable
ALTER TABLE "service_payments" ADD COLUMN     "refundReason" VARCHAR(255),
ADD COLUMN     "refundTransactionId" UUID,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "refundedById" UUID;
