-- CreateEnum
CREATE TYPE "PostCtaKind" AS ENUM ('FOLLOW', 'MESSAGE', 'TELEGRAM', 'INSTAGRAM', 'YOUTUBE', 'PHONE');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "ctaKind" "PostCtaKind",
ADD COLUMN     "ctaValue" VARCHAR(80),
ADD COLUMN     "ctaClickCount" INTEGER NOT NULL DEFAULT 0;

-- Tur va qiymat MOS kelishi shart.
--
-- `FOLLOW` va `MESSAGE` muallifning o'ziga ishora qiladi — ularda
-- qiymat bo'lishi mumkin emas. Qolganlarida esa qiymatsiz tugma
-- hech qayerga olib bormasdi.
--
-- Shart bazada tursa, bunday qator UMUMAN yozilmaydi.
ALTER TABLE "posts" ADD CONSTRAINT "posts_cta_value_match" CHECK (
      ("ctaKind" IS NULL AND "ctaValue" IS NULL)
   OR ("ctaKind" IN ('FOLLOW', 'MESSAGE') AND "ctaValue" IS NULL)
   OR ("ctaKind" IN ('TELEGRAM', 'INSTAGRAM', 'YOUTUBE', 'PHONE') AND "ctaValue" IS NOT NULL)
);

-- Bosishlar soni manfiy bo'lib qololmaydi.
ALTER TABLE "posts" ADD CONSTRAINT "posts_cta_click_count_positive" CHECK ("ctaClickCount" >= 0);
