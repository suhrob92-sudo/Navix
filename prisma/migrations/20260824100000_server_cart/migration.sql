-- Savat serverga ko'chadi.

CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" INTEGER NOT NULL,
    "savedForLater" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cart_items_userId_savedForLater_updatedAt_idx" ON "cart_items"("userId", "savedForLater", "updatedAt");
CREATE INDEX "cart_items_updatedAt_idx" ON "cart_items"("updatedAt");
CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");
CREATE INDEX "cart_items_variantId_idx" ON "cart_items"("variantId");

-- ── Nima uchun IKKITA yagonalik indeksi ──────────────────────────────
--
-- Bitta `UNIQUE ("userId", "productId", "variantId")` yetarli
-- ko'rinadi, lekin u ISHLAMAYDI: PostgreSQL'da NULL qiymatlar bir-biriga
-- TENG EMAS deb hisoblanadi.
--
-- Ya'ni variantsiz mahsulot (`variantId IS NULL`) savatga necha marta
-- qo'shilsa, shuncha alohida qator yaratilardi va savatda bitta
-- mahsulot besh marta ko'rinardi.
--
-- Shuning uchun ikkita QISMIY indeks ishlatiladi. Xuddi shu usul
-- `post_attachments` jadvalida ham qo'llangan.
CREATE UNIQUE INDEX "cart_items_user_product_key" ON "cart_items"("userId", "productId") WHERE "variantId" IS NULL;
CREATE UNIQUE INDEX "cart_items_user_variant_key" ON "cart_items"("userId", "productId", "variantId") WHERE "variantId" IS NOT NULL;

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
