import { z } from 'zod';

import { isOwnImageUrl } from '@/modules/upload/upload.types';
import { MAX_STORY_SECONDS, STORY_CAPTION_MAX_LENGTH } from '@/modules/story/story.types';

/**
 * Hikoyalar uchun validatsiya.
 */

/**
 * Biriktirilgan fayl manzili.
 *
 * Faqat O'ZIMIZ yuklagan fayl qabul qilinadi. Begona manzil qo'yilsa,
 * hikoyani ko'rgan HAR BIR odamning IP manzili o'sha saytga yetardi
 * va egasi faylni istalgan payt almashtira olardi.
 */
const ownFileField = z
  .string()
  .trim()
  .max(500)
  .refine(isOwnImageUrl, "Fayl manzili noto'g'ri. Faylni qaytadan yuklang.");

export const createStorySchema = z
  .object({
    caption: z
      .string()
      .trim()
      .max(STORY_CAPTION_MAX_LENGTH, `Izoh ${STORY_CAPTION_MAX_LENGTH} belgidan oshmasligi kerak.`)
      .default(''),
    imageUrl: ownFileField.optional(),
    videoUrl: ownFileField.optional(),
    videoPosterUrl: ownFileField.optional(),
    videoSeconds: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_STORY_SECONDS, `Hikoya videosi ${MAX_STORY_SECONDS} soniyadan uzun bo'lmasligi kerak.`)
      .optional(),
    productId: z.uuid("Mahsulot noto'g'ri tanlandi").optional(),
    /**
     * Ulashilayotgan post.
     *
     * Bu maydon ODAM to'ldirmaydi — u lentadagi "Hikoyaga qo'shish"
     * tugmasidan keladi. Shuning uchun uni tekshirish ayniqsa
     * muhim: qiymat brauzerdan kelayotgani o'zgarmaydi.
     */
    postId: z.uuid("Post noto'g'ri tanlandi").optional(),
  })
  /**
   * Matnning O'ZI hikoya bo'la olmaydi.
   *
   * Hikoya — ko'rinadigan narsa. Faqat matndan iborat hikoya lentadagi
   * postdan farq qilmasdi, lekin 24 soatdan keyin yo'qolib, odamning
   * yozganini bekorga yo'q qilardi.
   */
  .refine((value) => Boolean(value.imageUrl) || Boolean(value.videoUrl), {
    message: 'Hikoya uchun rasm yoki video biriktiring.',
    path: ['imageUrl'],
  })
  .refine((value) => !(value.imageUrl && value.videoUrl), {
    message: "Bitta hikoyaga rasm ham, video ham biriktirib bo'lmaydi.",
    path: ['videoUrl'],
  });

export type CreateStoryInput = z.infer<typeof createStorySchema>;
