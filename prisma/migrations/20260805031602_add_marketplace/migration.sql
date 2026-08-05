-- CreateEnum
CREATE TYPE "MarketOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL,
    "ownerId" UUID,
    "slug" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "searchName" VARCHAR(200) NOT NULL,
    "deliveryFee" BIGINT NOT NULL,
    "minOrder" BIGINT NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "color" VARCHAR(20) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "icon" VARCHAR(40) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "price" BIGINT NOT NULL,
    "oldPrice" BIGINT,
    "searchName" VARCHAR(220) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_orders" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "addressId" UUID,
    "orderNumber" VARCHAR(40) NOT NULL,
    "status" "MarketOrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" BIGINT NOT NULL,
    "deliveryFee" BIGINT NOT NULL,
    "total" BIGINT NOT NULL,
    "deliveryAddress" VARCHAR(400) NOT NULL,
    "deliveryNote" VARCHAR(255),
    "walletTransactionId" UUID,
    "cancelReason" VARCHAR(255),
    "refundTransactionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "market_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_order_items" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID,
    "name" VARCHAR(160) NOT NULL,
    "unitPrice" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" BIGINT NOT NULL,

    CONSTRAINT "market_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shops_slug_key" ON "shops"("slug");

-- CreateIndex
CREATE INDEX "shops_isActive_sortOrder_idx" ON "shops"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "shops_ownerId_idx" ON "shops"("ownerId");

-- CreateIndex
CREATE INDEX "shops_searchName_idx" ON "shops"("searchName");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_slug_key" ON "product_categories"("slug");

-- CreateIndex
CREATE INDEX "product_categories_sortOrder_idx" ON "product_categories"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_shopId_isActive_idx" ON "products"("shopId", "isActive");

-- CreateIndex
CREATE INDEX "products_categoryId_sortOrder_idx" ON "products"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "products_searchName_idx" ON "products"("searchName");

-- CreateIndex
CREATE INDEX "products_isActive_price_idx" ON "products"("isActive", "price");

-- CreateIndex
CREATE UNIQUE INDEX "market_orders_orderNumber_key" ON "market_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "market_orders_userId_createdAt_idx" ON "market_orders"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "market_orders_shopId_status_idx" ON "market_orders"("shopId", "status");

-- CreateIndex
CREATE INDEX "market_orders_status_idx" ON "market_orders"("status");

-- CreateIndex
CREATE INDEX "market_order_items_orderId_idx" ON "market_order_items"("orderId");

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_order_items" ADD CONSTRAINT "market_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "market_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_order_items" ADD CONSTRAINT "market_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
