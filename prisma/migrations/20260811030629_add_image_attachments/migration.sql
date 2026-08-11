-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "imageUrl" VARCHAR(500);

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "imageUrl" VARCHAR(500);

-- Qo'lda qo'shilgan shartlar (Prisma sxemasi bularni ifodalay olmaydi).

-- Endi post BO'SH MATN bilan ham bo'lishi mumkin — agar rasmi bo'lsa.
--
-- Eski shart "matn bo'sh bo'lmasin" deb turardi va rasmli postni
-- o'tkazmasdi. Uning o'rniga "matn YOKI rasm bo'lsin" degan shart
-- qo'yiladi: butunlay bo'sh post baribir yaratilmaydi.
ALTER TABLE "posts" DROP CONSTRAINT "posts_body_not_blank";
ALTER TABLE "posts" ADD CONSTRAINT "posts_body_or_image"
  CHECK (btrim("body") <> '' OR "imageUrl" IS NOT NULL);

-- Xabar uchun ham xuddi shu qoida.
--
-- Bu shart ilgari YO'Q edi (tekshiruv faqat kodda edi). Endi rasm
-- qo'shilgani uchun "bo'sh matn" ruxsat etilgan holatga aylandi va
-- chegarani bazada aniq belgilash zarur bo'ldi.
ALTER TABLE "messages" ADD CONSTRAINT "messages_body_or_image"
  CHECK (btrim("body") <> '' OR "imageUrl" IS NOT NULL);
