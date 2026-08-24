import { Prisma } from '@/generated/prisma/client';
import {
  MAX_OPTIONS,
  MAX_VALUES_PER_OPTION,
  MAX_VARIANTS,
  variantLabel,
} from '@/config/product-variant';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import {
  emptyVariants,
  type OptionInput,
  type VariantInput,
  type VariantsView,
} from '@/modules/product/product-variant.types';

/**
 * Mahsulot variantlari.
 *
 * ── Modulning ENG NOZIK joyi: MAHSULOTDAGI NUSXA ──────────────────────
 * Variant bo'lsa, `products.price` va `products.stock` NUSXA bo'lib
 * qoladi:
 *
 *   · narx   = eng arzon variant narxi ("dan" belgisi bilan);
 *   · zaxira = variantlar zaxirasining yig'indisi.
 *
 * Nusxa katalog uchun kerak: 40 mahsulotli sahifada har biriga
 * variantlarni qo'shib hisoblash o'ndan ortiq so'rov bo'lardi.
 *
 * Nusxa HAR SAFAR bir tranzaksiyada yangilanadi — variant
 * o'zgarganda ham, buyurtma berilganda ham. Aks holda katalogda
 * "3 ta qoldi" deb yozilar, ichkarida esa hech narsa qolmasdi.
 */

const VALUE_SELECT = { id: true, value: true, sortOrder: true } as const;

/** Mahsulot shu odamnikimi. */
async function requireOwnership(productId: string, userId: string, isAdmin: boolean): Promise<void> {
  const row = await prisma.product.findFirst({
    where: { id: productId, ...(isAdmin ? {} : { shop: { ownerId: userId } }) },
    select: { id: true },
  });

  if (!row) {
    throw new NotFoundError('Mahsulot');
  }
}

/** Mahsulotning tanlovlari va variantlari. */
export async function getVariants(productId: string): Promise<VariantsView> {
  const [options, variants] = await Promise.all([
    prisma.productOption.findMany({
      where: { productId },
      select: {
        id: true,
        name: true,
        values: { select: VALUE_SELECT, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.productVariant.findMany({
      where: { productId },
      select: {
        id: true,
        price: true,
        oldPrice: true,
        stock: true,
        isActive: true,
        values: {
          select: { optionValue: { select: { id: true, value: true, optionId: true } } },
        },
      },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  if (options.length === 0) return emptyVariants();

  /** Qiymatlarni TANLOVLAR TARTIBIDA joylash uchun. */
  const optionOrder = new Map(options.map((option, index) => [option.id, index]));

  return {
    options: options.map((option) => ({
      id: option.id,
      name: option.name,
      values: option.values.map((value) => ({ id: value.id, value: value.value })),
    })),
    variants: variants.map((variant) => {
      /**
       * Qiymatlar TANLOVLAR TARTIBIDA saralanadi.
       *
       * Bazadan ular tasodifiy tartibda keladi va nom
       * "256 GB · Qora" bo'lib chiqishi mumkin edi — sotuvchi
       * ularni "Rang, Xotira" tartibida kiritgan bo'lsa ham.
       */
      const sorted = [...variant.values].sort(
        (a, b) =>
          (optionOrder.get(a.optionValue.optionId) ?? 0) -
          (optionOrder.get(b.optionValue.optionId) ?? 0),
      );

      return {
        id: variant.id,
        price: tiyinToNumber(variant.price),
        oldPrice: variant.oldPrice === null ? null : tiyinToNumber(variant.oldPrice),
        stock: variant.stock,
        isActive: variant.isActive,
        optionValueIds: sorted.map((row) => row.optionValue.id),
        label: variantLabel(sorted.map((row) => row.optionValue.value)),
      };
    }),
  };
}

/**
 * Mahsulotdagi NUSXANI yangilaydi.
 *
 * ── Nima uchun ALOHIDA funksiya ───────────────────────────────────────
 * Bu hisob ikki joyda kerak: variant tahrirlanganda va buyurtma
 * berilganda. Ikki joyda qo'lda yozilsa, bittasi unutilardi va
 * katalog haqiqatdan ajralib qolardi.
 *
 * @param tx Tranzaksiya mijozi — hisob yozuv bilan bitta amalda
 *   bajarilishi shart.
 */
export async function syncProductFromVariants(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<void> {
  const variants = await tx.productVariant.findMany({
    where: { productId, isActive: true },
    select: { price: true, stock: true },
  });

  /**
   * Variant qolmasa, mahsulot ESKICHA ishlaydi.
   *
   * Narx va zaxirani nolga tushirish XATO bo'lardi: sotuvchi
   * variantlarni o'chirib, oddiy mahsulotga qaytishi mumkin va
   * unda uning o'z narxi bor.
   */
  if (variants.length === 0) return;

  const price = variants.reduce(
    (min, row) => (row.price < min ? row.price : min),
    variants[0].price,
  );
  const stock = variants.reduce((sum, row) => sum + row.stock, 0);

  await tx.product.update({
    where: { id: productId },
    data: { price, stock },
    select: { id: true },
  });
}

/**
 * Tanlovlar va variantlarni TO'LIQ almashtiradi.
 *
 * ── Nima uchun butun ro'yxat ──────────────────────────────────────────
 * "Bitta variant qo'sh", "bittasining narxini o'zgartir" degan
 * amallar ham mumkin edi.
 *
 * Lekin variantlar bir-biriga bog'liq: yangi rang qo'shilsa, u har
 * bir xotira bilan birikma hosil qiladi. Alohida amallarda yarim
 * yig'ilgan holat paydo bo'lardi — masalan rang qo'shilib, uning
 * variantlari hali yaratilmagan.
 *
 * ── Nima uchun ESKISI o'chiriladi ─────────────────────────────────────
 * Eski variantlarni saqlab, moslashtirishga urinish kod ham, xato
 * ham ko'p bo'lardi. O'chirish esa aniq: buyurtmadagi bog'lanish
 * `SetNull` bilan uziladi va tarix saqlanib qoladi — nomi va narxi
 * nusxa qilingan.
 */
export async function replaceVariants(
  productId: string,
  input: { options: readonly OptionInput[]; variants: readonly VariantInput[] },
  actor: { userId: string; isAdmin: boolean },
): Promise<VariantsView> {
  await requireOwnership(productId, actor.userId, actor.isAdmin);

  const options = input.options
    .map((option) => ({
      name: option.name.trim(),
      values: [...new Set(option.values.map((value) => value.trim()).filter(Boolean))],
    }))
    .filter((option) => option.name.length > 0 && option.values.length > 0);

  if (options.length > MAX_OPTIONS) {
    throw new ConflictError(`Eng ko'pi ${MAX_OPTIONS} ta tanlov bo'lishi mumkin`);
  }

  for (const option of options) {
    if (option.values.length > MAX_VALUES_PER_OPTION) {
      throw new ConflictError(
        `"${option.name}" uchun eng ko'pi ${MAX_VALUES_PER_OPTION} ta qiymat bo'lishi mumkin`,
      );
    }
  }

  /** Tanlov nomlari takrorlanmasligi kerak. */
  const optionNames = new Set(options.map((option) => option.name.toLowerCase()));

  if (optionNames.size !== options.length) {
    throw new ConflictError('Tanlov nomi ikki marta yozilgan');
  }

  // Tanlovlar bo'lmasa — variantlar ham bo'lmaydi.
  if (options.length === 0) {
    await prisma.$transaction([
      prisma.productVariant.deleteMany({ where: { productId } }),
      prisma.productOption.deleteMany({ where: { productId } }),
    ]);

    logger.info({ productId, userId: actor.userId }, 'Variantlar olib tashlandi');

    return emptyVariants();
  }

  const variants = input.variants.filter((variant) => variant.values.length === options.length);

  if (variants.length === 0) {
    throw new ValidationError('Kamida bitta variant kerak', {
      variants: ['Har bir tanlovdan bittadan qiymat tanlang'],
    });
  }

  if (variants.length > MAX_VARIANTS) {
    throw new ConflictError(`Eng ko'pi ${MAX_VARIANTS} ta variant bo'lishi mumkin`);
  }

  /**
   * Har bir qiymat O'Z tanlovida borligini tekshiramiz.
   *
   * Aks holda "Qora" rangni "Xotira" tanloviga bog'lab yuborish
   * mumkin bo'lardi va variant nomi ma'nosiz chiqardi.
   */
  for (const variant of variants) {
    variant.values.forEach((value, index) => {
      if (!options[index].values.includes(value.trim())) {
        throw new ValidationError('Variant qiymati topilmadi', {
          variants: [`"${value}" — "${options[index].name}" tanlovida yo'q`],
        });
      }
    });
  }

  /** Birikmalar takrorlanmasligi kerak. */
  const combos = new Set(variants.map((variant) => variant.values.map((v) => v.trim()).join(' ')));

  if (combos.size !== variants.length) {
    throw new ConflictError('Bir xil birikma ikki marta yozilgan');
  }

  await prisma.$transaction(async (tx) => {
    // Eskisini butunlay olib tashlaymiz.
    await tx.productVariant.deleteMany({ where: { productId } });
    await tx.productOption.deleteMany({ where: { productId } });

    /** Qiymat matnidan uning yangi ID'siga. */
    const valueIds = new Map<string, string>();

    for (const [optionIndex, option] of options.entries()) {
      const created = await tx.productOption.create({
        data: {
          productId,
          name: option.name,
          sortOrder: optionIndex,
          values: {
            create: option.values.map((value, valueIndex) => ({ value, sortOrder: valueIndex })),
          },
        },
        select: { id: true, values: { select: { id: true, value: true } } },
      });

      for (const value of created.values) {
        /**
         * Kalitda TANLOV RAQAMI ham bor.
         *
         * Turli tanlovlarda bir xil qiymat bo'lishi mumkin
         * ("Oq" rang va "Oq" naqsh) va faqat matn bilan
         * kalitlansa, ular bir-birini bosib ketardi.
         */
        valueIds.set(`${optionIndex} ${value.value}`, value.id);
      }
    }

    for (const [index, variant] of variants.entries()) {
      await tx.productVariant.create({
        data: {
          productId,
          price: somToTiyin(variant.priceSom),
          oldPrice: variant.oldPriceSom === null ? null : somToTiyin(variant.oldPriceSom),
          stock: variant.stock,
          isActive: variant.isActive,
          sortOrder: index,
          values: {
            create: variant.values.map((value, optionIndex) => ({
              optionValueId: valueIds.get(`${optionIndex} ${value.trim()}`)!,
            })),
          },
        },
        select: { id: true },
      });
    }

    await syncProductFromVariants(tx, productId);
  });

  logger.info(
    { productId, userId: actor.userId, options: options.length, variants: variants.length },
    'Variantlar yangilandi',
  );

  return getVariants(productId);
}
