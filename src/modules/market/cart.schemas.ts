import { z } from 'zod';

import { MAX_CART_LINES, MAX_QUANTITY_PER_LINE } from '@/config/cart';

/**
 * Savat so'rovlarining shakli.
 *
 * ── Nima uchun qator ID bilan emas, MAHSULOT bilan aniqlanadi ─────────
 * `PATCH /cart/<qator-id>` ko'rinishi odatiyroq bo'lardi. Lekin
 * brauzer qator ID'sini bilmaydi: u mahsulot sahifasida turib
 * "savatga qo'sh" bosadi va qo'lida faqat mahsulot bilan variant
 * bo'ladi.
 *
 * ID bo'yicha ishlash uchun har bir amaldan oldin savatni o'qib,
 * kerakli qatorni topish kerak bo'lardi — ya'ni ikki barobar
 * so'rov.
 */

const productId = z.uuid("Mahsulot ID noto'g'ri");
const variantId = z.uuid("Mahsulot turi ID noto'g'ri").nullish();

/** Savatga qo'shish. */
export const addToCartSchema = z.object({
  productId,
  variantId,
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE).optional(),
  /**
   * Boshqa do'kon tanlanganda savatni tozalashga RUXSAT.
   *
   * Birinchi so'rov bu bayroqsiz yuboriladi va xato oladi; ekran
   * so'raydi; odam rozi bo'lsa, so'rov qaytariladi.
   */
  replaceShop: z.boolean().optional(),
});

/** Miqdorni belgilash yoki "keyinroq" ro'yxatiga ko'chirish. */
export const updateCartSchema = z
  .object({
    productId,
    variantId,
    /** Nol — qatorni o'chirish. */
    quantity: z.number().int().min(0).max(MAX_QUANTITY_PER_LINE).optional(),
    savedForLater: z.boolean().optional(),
  })
  .refine(
    (value) => value.quantity !== undefined || value.savedForLater !== undefined,
    "O'zgartirish uchun `quantity` yoki `savedForLater` kerak",
  );

/** Qatorni o'chirish yoki savatni butunlay tozalash. */
export const removeFromCartSchema = z.object({
  productId: productId.optional(),
  variantId,
  /** Butun savatni tozalash. */
  all: z.literal('true').optional(),
});

/**
 * Brauzerdagi eski savatni serverga ko'chirish.
 *
 * Bu so'rov har bir odamda BIR MARTA yuboriladi — savat serverga
 * ko'chgandan keyingi birinchi kirishda.
 */
export const mergeCartSchema = z.object({
  lines: z
    .array(
      z.object({
        productId,
        variantId,
        quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
      }),
    )
    .max(MAX_CART_LINES),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartInput = z.infer<typeof updateCartSchema>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;
