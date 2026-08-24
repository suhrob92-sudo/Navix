-- Buyurtma yo'li: holat tarixi va qaytarish so'rovi.

CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'OTHER');

-- ── Holat o'zgarishlari tarixi ──────────────────────────────────────
CREATE TABLE "market_order_events" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "MarketOrderStatus" NOT NULL,
    "actorId" UUID,
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_order_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "market_order_events_orderId_createdAt_idx" ON "market_order_events"("orderId", "createdAt");
CREATE INDEX "market_order_events_actorId_idx" ON "market_order_events"("actorId");

ALTER TABLE "market_order_events" ADD CONSTRAINT "market_order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "market_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "market_order_events" ADD CONSTRAINT "market_order_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── ESKI buyurtmalar tarixi TIKLANADI ────────────────────────────────
--
-- Bu jadval bo'sh qolsa, bugungacha berilgan barcha buyurtmalar
-- tarixsiz ko'rinardi: xaridor "buyurtmam qachon yo'lga chiqqan edi?"
-- degan savolga javob topa olmasdi.
--
-- Yozuvlar mavjud ustunlardan yasaladi. `PACKING` bosqichi tiklanmaydi
-- — unga hech qachon ustun bo'lmagan va uni O'YLAB TOPISH yolg'on
-- ma'lumot yozish bo'lardi.
INSERT INTO "market_order_events" ("id", "orderId", "status", "actorId", "note", "createdAt")
SELECT gen_random_uuid(), "id", 'PENDING', "userId", NULL, "createdAt"
FROM "market_orders";

INSERT INTO "market_order_events" ("id", "orderId", "status", "actorId", "note", "createdAt")
SELECT gen_random_uuid(), "id", 'CONFIRMED', NULL, NULL, "confirmedAt"
FROM "market_orders" WHERE "confirmedAt" IS NOT NULL;

INSERT INTO "market_order_events" ("id", "orderId", "status", "actorId", "note", "createdAt")
SELECT gen_random_uuid(), "id", 'SHIPPED', NULL, NULL, "shippedAt"
FROM "market_orders" WHERE "shippedAt" IS NOT NULL;

INSERT INTO "market_order_events" ("id", "orderId", "status", "actorId", "note", "createdAt")
SELECT gen_random_uuid(), "id", 'DELIVERED', NULL, NULL, "deliveredAt"
FROM "market_orders" WHERE "deliveredAt" IS NOT NULL;

INSERT INTO "market_order_events" ("id", "orderId", "status", "actorId", "note", "createdAt")
SELECT gen_random_uuid(), "id", 'CANCELLED', NULL, "cancelReason", "cancelledAt"
FROM "market_orders" WHERE "cancelledAt" IS NOT NULL;

-- ── Qaytarish so'rovi ────────────────────────────────────────────────
CREATE TABLE "return_requests" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "ReturnReason" NOT NULL,
    "comment" VARCHAR(500),
    "amount" BIGINT NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "decidedById" UUID,
    "decisionNote" VARCHAR(255),
    "refundTransactionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- Bitta buyurtmada bitta so'rov: aks holda pul ikki marta qaytishi mumkin edi.
CREATE UNIQUE INDEX "return_requests_orderId_key" ON "return_requests"("orderId");
CREATE INDEX "return_requests_status_createdAt_idx" ON "return_requests"("status", "createdAt");
CREATE INDEX "return_requests_userId_createdAt_idx" ON "return_requests"("userId", "createdAt");
CREATE INDEX "return_requests_decidedById_idx" ON "return_requests"("decidedById");

ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "market_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "return_items" (
    "id" UUID NOT NULL,
    "returnId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "return_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "return_items_returnId_orderItemId_key" ON "return_items"("returnId", "orderItemId");
CREATE INDEX "return_items_orderItemId_idx" ON "return_items"("orderItemId");

ALTER TABLE "return_items" ADD CONSTRAINT "return_items_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "market_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
