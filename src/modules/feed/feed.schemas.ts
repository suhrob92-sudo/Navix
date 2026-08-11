import { z } from 'zod';

import { COMMENT_MAX_LENGTH, POST_MAX_LENGTH } from '@/modules/feed/feed.types';

/**
 * Lenta uchun validatsiya.
 */

/**
 * Belgi (cursor) — "shu joydan keyingisini ber".
 *
 * Ichida vaqt va ID bor: `2026-08-11T02:10:00.000Z_9f0e…`. Ikkovi ham
 * kerak, chunki bir soniyada bir nechta post yozilishi mumkin va faqat
 * vaqt bo'yicha o'qilganda ulardan biri tushib qolardi.
 *
 * Naqsh qat'iy tekshiriladi: belgi manzildan keladi, ya'ni uni
 * istalgan odam o'zgartira oladi.
 */
export const feedCursorSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z_[0-9a-f-]{36}$/, "Belgi noto'g'ri");

export const feedQuerySchema = z.object({
  tab: z.enum(['FOLLOWING', 'LATEST']).default('FOLLOWING'),
  cursor: feedCursorSchema.optional(),
  /**
   * Bir so'rovda nechta post.
   *
   * Yigirma — telefonda ikki-uch ekran. Ko'proq yuklash mobil trafikni
   * bekorga sarflaydi: odam pastga tushmasligi ham mumkin.
   */
  limit: z.coerce.number().int().min(1).max(30).default(20),
});

export type FeedQuery = z.infer<typeof feedQuerySchema>;

export const commentsQuerySchema = z.object({
  cursor: feedCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export type CommentsQuery = z.infer<typeof commentsQuerySchema>;

/**
 * Matn maydoni uchun umumiy qoida.
 *
 * `trim` MUHIM: faqat bo'sh joydan iborat post bazaga tushmasligi
 * kerak. Baza ham shu shartni tekshiradi, lekin xato matni u yerda
 * foydalanuvchiga tushunarsiz bo'lardi.
 */
function bodyField(max: number, emptyMessage: string) {
  return z.string().trim().min(1, emptyMessage).max(max, `Matn ${max} belgidan oshmasligi kerak.`);
}

export const createPostSchema = z.object({
  body: bodyField(POST_MAX_LENGTH, "Post bo'sh bo'lmasligi kerak."),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  body: bodyField(COMMENT_MAX_LENGTH, "Izoh bo'sh bo'lmasligi kerak."),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
