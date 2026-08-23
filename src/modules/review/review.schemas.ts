import { z } from 'zod';

import { MAX_RATING, MIN_RATING, REVIEW_BODY_MAX_LENGTH, REVIEW_PAGE_SIZE } from '@/config/review';

/**
 * Baho va sharh — validatsiya.
 */

const ratingSchema = z
  .number({ message: 'Bahoni tanlang' })
  .int('Baho butun son')
  .min(MIN_RATING, `Eng kami ${MIN_RATING}`)
  .max(MAX_RATING, `Eng ko'pi ${MAX_RATING}`);

/**
 * Sharh matni.
 *
 * ── Nima uchun bo'sh matn `null` ga aylanadi ──────────────────────────
 * Brauzer bo'sh maydonni `""` deb yuboradi. Uni shundayligicha
 * saqlasak, bazada "bo'sh matn" va "matn yo'q" degan ikki xil holat
 * paydo bo'lardi va ro'yxatda bo'sh sharh kartochkasi ko'rinardi.
 */
const bodySchema = z
  .string()
  .trim()
  .max(REVIEW_BODY_MAX_LENGTH, 'Sharh juda uzun')
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

/** POST — baho qo'yish yoki o'zgartirish. */
export const upsertReviewSchema = z.object({
  rating: ratingSchema,
  body: bodySchema,
});

export type UpsertReviewInput = z.infer<typeof upsertReviewSchema>;

/**
 * GET — sharhlar ro'yxati.
 *
 * ── Nima uchun `cursor` emas, `page` ──────────────────────────────────
 * Sharhlar lentadan farq qiladi: ular tez-tez qo'shilmaydi va odam
 * ularni oxirigacha varaqlamaydi. Oddiy sahifalash yetarli va
 * uni tushunish osonroq.
 */
export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(REVIEW_PAGE_SIZE),
});

export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;
