import { z } from 'zod';

import { IMAGE_ALT_MAX_LENGTH, MAX_CATALOG_IMAGES } from '@/config/catalog-image';
import { isOwnImageUrl } from '@/modules/upload/upload.types';

/**
 * Katalog rasmlari — validatsiya.
 *
 * ── Bu yerdagi ENG MUHIM tekshiruv: manzil BIZNIKIMI ──────────────────
 * Brauzer "mahsulotimga shu rasmni biriktir" deb istalgan manzilni
 * yuborishi mumkin, jumladan begona saytdagi rasmni.
 *
 * U holda katalogda begona sayt yuklanardi: u har bir ko'rgan
 * xaridorning IP manzilini yig'ib olardi va istalgan payt rasmni
 * boshqasiga — masalan reklamaga yoki nomaqbul suratga —
 * almashtira olardi. Bunda bizda hech qanday nazorat qolmasdi.
 *
 * Shuning uchun faqat O'ZIMIZ yaratgan manzil qabul qilinadi.
 */

const imageUrlSchema = z
  .string()
  .trim()
  .min(1, 'Rasm manzili bo\'sh')
  .max(500, 'Manzil juda uzun')
  .refine(isOwnImageUrl, 'Rasm avval yuklanishi kerak');

/** POST — rasm qo'shish. */
export const addCatalogImageSchema = z.object({
  url: imageUrlSchema,
  /**
   * Tavsif ixtiyoriy: berilmasa nomdan yasaladi.
   *
   * Sotuvchini tavsif yozishga majburlash — rasm qo'shishdan butunlay
   * voz kechishga olib keladigan yo'l.
   */
  alt: z.string().trim().max(IMAGE_ALT_MAX_LENGTH, 'Tavsif juda uzun').optional(),
});

export type AddCatalogImageInput = z.infer<typeof addCatalogImageSchema>;

/** PUT — tartibni o'zgartirish. */
export const reorderCatalogImagesSchema = z.object({
  /**
   * BUTUN ro'yxat yuboriladi.
   *
   * Chegara xizmatdagi chegara bilan bir xil: undan uzun ro'yxat
   * baribir mos kelmasdi, lekin bu yerda to'xtatilsa, bazaga
   * so'rov ham ketmaydi.
   */
  imageIds: z
    .array(z.uuid("Rasm ID noto'g'ri"))
    .min(1, "Ro'yxat bo'sh")
    .max(MAX_CATALOG_IMAGES, "Rasm soni chegaradan ko'p"),
});

export type ReorderCatalogImagesInput = z.infer<typeof reorderCatalogImagesSchema>;
