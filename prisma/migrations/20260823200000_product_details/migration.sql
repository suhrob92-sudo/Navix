-- Mahsulot sahifasi: xususiyatlar va savol-javob.

-- ─── Xususiyatlar ───────────────────────────────────────────────────
--
-- Ularni tavsif matniga yozib qo'yish mumkin edi, lekin unda jadval
-- ko'rinishida chizilmasdi va ertaga ular bo'yicha filtr qo'shib
-- bo'lmasdi.
CREATE TABLE "product_attributes" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "name" VARCHAR(60) NOT NULL,
  "value" VARCHAR(200) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- Bitta mahsulotda bir xil nomli xususiyat ikki marta bo'lmaydi.
CREATE UNIQUE INDEX "product_attributes_productId_name_key"
  ON "product_attributes"("productId", "name");
CREATE INDEX "product_attributes_productId_sortOrder_idx"
  ON "product_attributes"("productId", "sortOrder");

ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Savollar ───────────────────────────────────────────────────────
--
-- Bahodan farqi: savolni ISTALGAN kirgan odam bera oladi. Savol
-- aynan sotib olishdan OLDIN tug'iladi va "faqat xaridor so'rasin"
-- degan qoida bu bo'limni ma'nosiz qilardi.
CREATE TABLE "product_questions" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "body" VARCHAR(500) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_questions_productId_createdAt_idx"
  ON "product_questions"("productId", "createdAt");
CREATE INDEX "product_questions_authorId_createdAt_idx"
  ON "product_questions"("authorId", "createdAt");

ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Javoblar ───────────────────────────────────────────────────────
CREATE TABLE "product_answers" (
  "id" UUID NOT NULL,
  "questionId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "isFromSeller" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_answers_pkey" PRIMARY KEY ("id")
);

-- Bitta odam bitta savolga bir marta javob beradi.
--
-- Usiz bahs boshlanardi va u bu bo'limni chatga aylantirardi.
CREATE UNIQUE INDEX "product_answers_questionId_authorId_key"
  ON "product_answers"("questionId", "authorId");
CREATE INDEX "product_answers_questionId_createdAt_idx"
  ON "product_answers"("questionId", "createdAt");

-- `authorId` uchun ALOHIDA indeks.
--
-- Yuqoridagi cheklovda u bor, lekin IKKINCHI ustun sifatida —
-- ya'ni faqat `questionId` bilan birga qidirilganda ishlaydi.
-- Hisob o'chirilganda esa baza "shu odamning javoblari"ni
-- qidiradi va indekssiz butun jadvalni skanerlardi.
CREATE INDEX "product_answers_authorId_idx" ON "product_answers"("authorId");

ALTER TABLE "product_answers" ADD CONSTRAINT "product_answers_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "product_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_answers" ADD CONSTRAINT "product_answers_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
