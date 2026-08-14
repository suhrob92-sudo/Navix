-- Yangi jadval AVVAL yaratiladi: eski ustundagi ma'lumot unga
-- ko'chirilishi kerak.
CREATE TABLE "post_products" (
    "postId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_products_pkey" PRIMARY KEY ("postId","productId")
);

CREATE INDEX "post_products_productId_idx" ON "post_products"("productId");

ALTER TABLE "post_products" ADD CONSTRAINT "post_products_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_products" ADD CONSTRAINT "post_products_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MAVJUD biriktirmalar ko'chiriladi.
--
-- Busiz ustun o'chirilganda allaqachon biriktirilgan mahsulotlar
-- yo'qolardi: video qolar, tugma esa g'oyib bo'lardi.
INSERT INTO "post_products" ("postId", "productId", "sortOrder")
SELECT "id", "productId", 0 FROM "posts" WHERE "productId" IS NOT NULL;

-- Endi eski ustunni olib tashlash xavfsiz.
ALTER TABLE "posts" DROP CONSTRAINT "posts_productId_fkey";
ALTER TABLE "posts" DROP COLUMN "productId";

-- Ko'rishlar soni.
ALTER TABLE "posts" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
