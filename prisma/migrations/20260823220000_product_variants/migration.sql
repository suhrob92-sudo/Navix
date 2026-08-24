-- Mahsulot variantlari: rang, o'lcham, xotira.
--
-- Hozirgacha "qora 128 GB" va "oq 256 GB" ikkita ALOHIDA mahsulot
-- edi: xaridor rangni almashtirish uchun katalogga qaytishi kerak
-- bo'lardi, baholar esa ikkiga bo'linib ketardi.

-- ─── Tanlovlar ──────────────────────────────────────────────────────
CREATE TABLE "product_options" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "name" VARCHAR(40) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "product_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_options_productId_name_key" ON "product_options"("productId", "name");
CREATE INDEX "product_options_productId_sortOrder_idx" ON "product_options"("productId", "sortOrder");

ALTER TABLE "product_options" ADD CONSTRAINT "product_options_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Tanlov qiymatlari ──────────────────────────────────────────────
CREATE TABLE "product_option_values" (
  "id" UUID NOT NULL,
  "optionId" UUID NOT NULL,
  "value" VARCHAR(60) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "product_option_values_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_option_values_optionId_value_key" ON "product_option_values"("optionId", "value");
CREATE INDEX "product_option_values_optionId_sortOrder_idx" ON "product_option_values"("optionId", "sortOrder");

ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_optionId_fkey"
  FOREIGN KEY ("optionId") REFERENCES "product_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Variantlar ─────────────────────────────────────────────────────
--
-- Narx va zaxira shu yerda: 256 GB li telefon qimmatroq va uning
-- omboridagi soni ham boshqacha.
CREATE TABLE "product_variants" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "price" BIGINT NOT NULL,
  "oldPrice" BIGINT,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- Narx va zaxira MANFIY bo'lishi mumkin emas.
--
-- Dastur allaqachon tekshiradi, lekin baza — oxirgi hakam: qo'lda
-- yozilgan so'rov bu qoidani chetlab o'ta olmaydi.
ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_price_positive" CHECK ("price" > 0),
  ADD CONSTRAINT "product_variants_stock_not_negative" CHECK ("stock" >= 0);

CREATE INDEX "product_variants_productId_sortOrder_idx" ON "product_variants"("productId", "sortOrder");

ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Variant va qiymat bog'lanishi ──────────────────────────────────
CREATE TABLE "product_variant_values" (
  "variantId" UUID NOT NULL,
  "optionValueId" UUID NOT NULL,

  CONSTRAINT "product_variant_values_pkey" PRIMARY KEY ("variantId", "optionValueId")
);

CREATE INDEX "product_variant_values_optionValueId_idx" ON "product_variant_values"("optionValueId");

ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_optionValueId_fkey"
  FOREIGN KEY ("optionValueId") REFERENCES "product_option_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Buyurtma qatorida variant ──────────────────────────────────────
--
-- Nomi NUSXA qilib saqlanadi: sotuvchi ertaga "Qora" ni "Tungi qora"
-- deb o'zgartirsa ham, eski buyurtmada xaridor nima olganini
-- ko'rishi kerak.
ALTER TABLE "market_order_items"
  ADD COLUMN "variantId" UUID,
  ADD COLUMN "variantLabel" VARCHAR(200);

CREATE INDEX "market_order_items_variantId_idx" ON "market_order_items"("variantId");

ALTER TABLE "market_order_items" ADD CONSTRAINT "market_order_items_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
