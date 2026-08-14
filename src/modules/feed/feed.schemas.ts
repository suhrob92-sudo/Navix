import { z } from 'zod';

import { COMMENT_MAX_LENGTH, MAX_TAGGED_PRODUCTS, POST_MAX_LENGTH } from '@/modules/feed/feed.types';
import { MAX_VIDEO_SECONDS } from '@/modules/upload/upload.types';
import { isOwnImageUrl } from '@/modules/upload/upload.types';

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
  tab: z.enum(['FOLLOWING', 'LATEST', 'VIDEO']).default('FOLLOWING'),
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
  /**
   * Qaysi izohning javoblari.
   *
   * Berilmasa — FAQAT asosiy izohlar qaytadi. Javoblar aralashib
   * ketsa, kim kimga javob berayotgani bilinmay qolardi.
   */
  parentId: z.uuid("Izoh noto'g'ri").optional(),
});

export type CommentsQuery = z.infer<typeof commentsQuerySchema>;

/** Mavzu sahifasi uchun so'rov. */
export const hashtagQuerySchema = z.object({
  cursor: feedCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
});

export type HashtagQuery = z.infer<typeof hashtagQuerySchema>;

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

/**
 * Biriktirilgan rasm manzili.
 *
 * ── Nima uchun BEGONA manzil qabul qilinmaydi ────────────────────────
 * Manzilni brauzer yuboradi, ya'ni uni istalgan qiymatga
 * o'zgartirish mumkin. Begona saytdagi rasm biriktirilsa, u lentani
 * ko'rgan HAR BIR odamning IP manzilini o'sha saytga yetkazardi va
 * egasi rasmni istalgan payt boshqasiga almashtira olardi.
 *
 * Shuning uchun faqat o'zimiz yuklagan rasm o'tadi
 * (`isOwnImageUrl` — `upload.types.ts` da sabab batafsil).
 */
const attachedImageField = z
  .string()
  .trim()
  .max(500)
  .refine(isOwnImageUrl, "Rasm manzili noto'g'ri. Rasmni qaytadan yuklang.");

/**
 * Post yozish.
 *
 * ── Nima uchun matn BO'SH bo'lishi mumkin ────────────────────────────
 * Rasm o'zi ham post: "mana shu manzara" degan postga matn shart
 * emas. Lekin ikkalasi ham bo'sh bo'lsa — post yaratilmaydi.
 */
export const createPostSchema = z
  .object({
    body: z.string().trim().max(POST_MAX_LENGTH, `Matn ${POST_MAX_LENGTH} belgidan oshmasligi kerak.`).default(''),
    imageUrl: attachedImageField.optional(),
    /**
     * Video manzili — rasm bilan bir xil qoida: faqat O'ZIMIZ
     * yuklagan fayl. Begona manzil qo'yilsa, uni ko'rgan har bir
     * odamning IP manzili o'sha saytga yetardi.
     */
    videoUrl: attachedImageField.optional(),
    videoPosterUrl: attachedImageField.optional(),
    videoSeconds: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_VIDEO_SECONDS, `Video ${MAX_VIDEO_SECONDS} soniyadan uzun bo'lmasligi kerak.`)
      .optional(),
    /** Biriktirilgan mahsulotlar — mavjudligi xizmatda tekshiriladi. */
    productIds: z
      .array(z.uuid("Mahsulot noto'g'ri tanlandi"))
      .max(MAX_TAGGED_PRODUCTS, `Ko'pi bilan ${MAX_TAGGED_PRODUCTS} ta mahsulot biriktiriladi.`)
      .optional(),
  })
  .refine(
    (value) => value.body.length > 0 || Boolean(value.imageUrl) || Boolean(value.videoUrl),
    "Post bo'sh: matn yozing yoki rasm/video biriktiring.",
  )
  .refine((value) => !(value.imageUrl && value.videoUrl), {
    message: "Bitta postga rasm ham, video ham biriktirib bo'lmaydi.",
    path: ['videoUrl'],
  })
  .refine((value) => (value.productIds?.length ?? 0) === 0 || Boolean(value.videoUrl), {
    message: 'Mahsulotni faqat videoga biriktirish mumkin.',
    path: ['productIds'],
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;

/**
 * Postni tahrirlash.
 *
 * Faqat MATN o'zgaradi — rasm tegilmaydi. Matn bo'sh bo'lishi
 * mumkin, lekin faqat rasm biriktirilgan postda; buni xizmat
 * tekshiradi, chunki bu yerda postning rasmi bor-yo'qligi
 * ma'lum emas.
 */
export const updatePostSchema = z.object({
  body: z.string().trim().max(POST_MAX_LENGTH, `Matn ${POST_MAX_LENGTH} belgidan oshmasligi kerak.`),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const createCommentSchema = z.object({
  body: bodyField(COMMENT_MAX_LENGTH, "Izoh bo'sh bo'lmasligi kerak."),
  /**
   * Qaysi izohga javob.
   *
   * Berilmasa — bu asosiy izoh. Xizmat javobning javobini ham
   * ASOSIY izohga biriktiradi (bir daraja qoidasi).
   */
  parentId: z.uuid("Izoh noto'g'ri").optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
