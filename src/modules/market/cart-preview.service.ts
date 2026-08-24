import { variantLabel } from '@/config/product-variant';
import { NotFoundError } from '@/lib/api/errors';
import { tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { THUMB_SELECT, toThumb } from '@/modules/catalog/catalog-image.select';
import type { CatalogThumb } from '@/modules/catalog/catalog-image.types';

/**
 * Savat ko'rinishi — SERVERDAN.
 *
 * ── Nima uchun bu kerak bo'lib qoldi ──────────────────────────────────
 * Ilgari savat sahifasi do'kon ro'yxatidan narx va zaxirani olardi:
 * u yerda har bir mahsulotning bitta narxi bor edi.
 *
 * Variant paydo bo'lgach bu yetmay qoldi. "Qora 256 GB" va
 * "Oq 128 GB" narxi ham, zaxirasi ham boshqacha va ular katalog
 * ro'yxatida umuman yo'q.
 *
 * ── Nima uchun narx BRAUZERDA hisoblanmaydi ───────────────────────────
 * Savat `localStorage` da turadi va uni foydalanuvchi tahrirlashi
 * mumkin. Narxni u yerdan olsak, "1 so'mga sotib olish" mumkin
 * bo'lardi.
 *
 * Bu yerdagi hisob KO'RSATISH uchun; buyurtma berilganda narx
 * yana bir marta, `createMarketOrder` ichida bazadan o'qiladi.
 * Ikki joyda o'qish ortiqcha emas: birinchisi ekran uchun,
 * ikkinchisi PUL uchun.
 */

export interface CartPreviewLine {
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  /** "Qora · 256 GB" yoki `null`. */
  variantLabel: string | null;
  /** Narx TIYINDA. */
  unitPrice: number;
  /** Shu variantda (yoki mahsulotda) nechta qolgan. */
  stock: number;
  image: CatalogThumb | null;
  /**
   * Qator hali ham haqiqiymi.
   *
   * `false` — mahsulot sotuvdan olingan yoki variant o'zgargan.
   * Bunday qator savatda QOLADI, lekin belgilanadi: uni jimgina
   * o'chirib yuborsak, odam "men buni qo'shgan edim-ku" deb
   * hayron bo'lardi.
   */
  isAvailable: boolean;
}

export interface CartPreviewResult {
  lines: CartPreviewLine[];
  /** Savatda bo'lgan, lekin topilmagan qatorlar soni. */
  missingCount: number;
}

/**
 * Savat qatorlarini bazadagi haqiqat bilan solishtiradi.
 *
 * @param shopId Faqat shu do'kon mahsulotlari qabul qilinadi —
 *   savat bitta do'konga tegishli.
 */
export async function previewCart(
  shopId: string,
  items: readonly { productId: string; variantId?: string | null; quantity: number }[],
): Promise<CartPreviewResult> {
  if (items.length === 0) {
    return { lines: [], missingCount: 0 };
  }

  const shop = await prisma.shop.findFirst({ where: { id: shopId }, select: { id: true } });

  if (!shop) {
    throw new NotFoundError("Do'kon");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((item) => item.productId) }, shopId },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      stock: true,
      isActive: true,
      images: THUMB_SELECT,
      options: { select: { id: true }, orderBy: { sortOrder: 'asc' } },
      variants: {
        select: {
          id: true,
          price: true,
          stock: true,
          isActive: true,
          values: { select: { optionValue: { select: { value: true, optionId: true } } } },
        },
      },
    },
  });

  const productById = new Map(products.map((product) => [product.id, product]));

  const lines: CartPreviewLine[] = [];
  let missingCount = 0;

  for (const item of items) {
    const product = productById.get(item.productId);

    if (!product) {
      missingCount += 1;
      continue;
    }

    const image = toThumb(product.images);

    /** Variantsiz mahsulot — narx va zaxira o'zidan. */
    if (product.options.length === 0) {
      lines.push({
        productId: product.id,
        variantId: null,
        slug: product.slug,
        name: product.name,
        variantLabel: null,
        unitPrice: tiyinToNumber(product.price),
        stock: product.stock,
        image,
        isAvailable: product.isActive,
      });

      continue;
    }

    const variant = item.variantId
      ? product.variants.find((row) => row.id === item.variantId)
      : undefined;

    if (!variant) {
      /**
       * Variant topilmadi: savat eskirgan.
       *
       * Qator KO'RSATILADI, lekin "mavjud emas" deb belgilanadi —
       * shunda odam nimani o'chirayotganini biladi.
       */
      lines.push({
        productId: product.id,
        variantId: item.variantId ?? null,
        slug: product.slug,
        name: product.name,
        variantLabel: null,
        unitPrice: tiyinToNumber(product.price),
        stock: 0,
        image,
        isAvailable: false,
      });

      continue;
    }

    const optionOrder = new Map(product.options.map((option, index) => [option.id, index]));

    const label = variantLabel(
      [...variant.values]
        .sort(
          (a, b) =>
            (optionOrder.get(a.optionValue.optionId) ?? 0) -
            (optionOrder.get(b.optionValue.optionId) ?? 0),
        )
        .map((row) => row.optionValue.value),
    );

    lines.push({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      variantLabel: label,
      unitPrice: tiyinToNumber(variant.price),
      stock: variant.stock,
      image,
      isAvailable: product.isActive && variant.isActive,
    });
  }

  return { lines, missingCount };
}
