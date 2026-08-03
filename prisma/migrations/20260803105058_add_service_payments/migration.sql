-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('UTILITY', 'INTERNET', 'MOBILE', 'TV');

-- CreateEnum
CREATE TYPE "ServicePaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "service_providers" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "description" VARCHAR(255),
    "accountLabel" VARCHAR(60) NOT NULL,
    "accountHint" VARCHAR(60) NOT NULL,
    "accountRegex" VARCHAR(200) NOT NULL,
    "minAmount" BIGINT NOT NULL,
    "maxAmount" BIGINT NOT NULL,
    "color" VARCHAR(20) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "accountNumber" VARCHAR(60) NOT NULL,
    "label" VARCHAR(60) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "saved_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_payments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "accountNumber" VARCHAR(60) NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "ServicePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "receiptNumber" VARCHAR(40) NOT NULL,
    "walletTransactionId" UUID,
    "externalReference" VARCHAR(120),
    "failureReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "service_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_providers_code_key" ON "service_providers"("code");

-- CreateIndex
CREATE INDEX "service_providers_category_isActive_sortOrder_idx" ON "service_providers"("category", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "saved_accounts_userId_deletedAt_idx" ON "saved_accounts"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "saved_accounts_userId_providerId_accountNumber_key" ON "saved_accounts"("userId", "providerId", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "service_payments_receiptNumber_key" ON "service_payments"("receiptNumber");

-- CreateIndex
CREATE INDEX "service_payments_userId_createdAt_idx" ON "service_payments"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "service_payments_status_idx" ON "service_payments"("status");

-- AddForeignKey
ALTER TABLE "saved_accounts" ADD CONSTRAINT "saved_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_accounts" ADD CONSTRAINT "saved_accounts_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
