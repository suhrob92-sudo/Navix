import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';
import { usernameParamSchema } from '@/modules/profile/social.schemas';
import { isOwnImageUrl, MAX_VOICE_SECONDS } from '@/modules/upload/upload.types';

/**
 * Chat moduli uchun validatsiya.
 */

/** GET /api/v1/chat/conversations */
export const conversationQuerySchema = paginationQuerySchema.extend({
  filter: z.enum(['ALL', 'UNREAD', 'BUSINESS', 'DIRECT']).default('ALL'),
  search: z.string().trim().min(1).max(80).optional(),
});

export type ConversationQuery = z.infer<typeof conversationQuerySchema>;

/**
 * POST /api/v1/chat/conversations — suhbatni ochish.
 *
 * ── Nima uchun "ochish", "yaratish" emas ──────────────────────────────
 * Suhbat allaqachon bo'lishi mumkin. Chaqiruvchi buni bilishi shart
 * emas: u shunchaki "shu odam bilan yozishmoqchiman" deydi, server esa
 * mavjudini qaytaradi yoki yangisini yaratadi.
 *
 * ── Nima uchun IKKI xil maydon ────────────────────────────────────────
 * Odam `username` bilan, biznes esa `slug` bilan aniqlanadi. Bittasi
 * berilishi shart — ikkalasi ham yoki hech biri emas.
 */
export const openConversationSchema = z
  .object({
    username: usernameParamSchema.optional(),
    businessSlug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(60)
      .regex(/^[a-z0-9-]+$/, "Manzil noto'g'ri")
      .optional(),
  })
  .refine(
    (value) => Boolean(value.username) !== Boolean(value.businessSlug),
    "Suhbat kimligini ko'rsating: foydalanuvchi yoki biznes",
  );

export type OpenConversationInput = z.infer<typeof openConversationSchema>;

/** POST /api/v1/chat/conversations/{id}/messages */
export const sendMessageSchema = z
  .object({
    /**
     * Xabar matni.
     *
     * Rasm biriktirilgan bo'lsa bo'sh bo'lishi mumkin, aks holda
     * bo'sh xabar yuborilmaydi: ro'yxatda bo'sh qator paydo bo'lardi
     * va uni o'chirishdan boshqa iloji qolmasdi.
     *
     * Chegara 4000 — bazadagi ustun bilan bir xil. Kattaroq matn
     * bazaga umuman yozilmasdi va xato tushunarsiz bo'lardi.
     */
    body: z.string().trim().max(4000, "Xabar juda uzun (4000 belgidan ko'p)").default(''),
    /**
     * Biriktirilgan rasm.
     *
     * Faqat o'zimiz yuklagan manzil qabul qilinadi — begona sayt
     * rasmini biriktirish suhbatdoshning IP manzilini o'sha saytga
     * yetkazardi.
     */
    imageUrl: z
      .string()
      .trim()
      .max(500)
      .refine(isOwnImageUrl, "Rasm manzili noto'g'ri. Rasmni qaytadan yuklang.")
      .optional(),
    /** Ovozli xabar — rasm bilan bir xil qoidaga bo'ysunadi. */
    voiceUrl: z
      .string()
      .trim()
      .max(500)
      .refine(isOwnImageUrl, "Ovoz manzili noto'g'ri. Qaytadan yozib ko'ring.")
      .optional(),
    /**
     * Ovoz davomiyligi (soniya).
     *
     * Brauzer o'lchaydi, ya'ni unga to'liq ishonib bo'lmaydi. Lekin
     * yolg'on qiymatning zarari yo'q: u faqat ekranda ko'rsatiladi.
     * Chegara esa mantiqsiz qiymatning oldini oladi.
     */
    voiceSeconds: z.coerce.number().int().min(1).max(MAX_VOICE_SECONDS).optional(),
  })
  .refine(
    (value) => value.body.length > 0 || Boolean(value.imageUrl) || Boolean(value.voiceUrl),
    "Xabar bo'sh: matn yozing, rasm yoki ovoz biriktiring.",
  )
  /**
   * Ovoz va davomiyligi BIRGA keladi.
   *
   * Davomiyliksiz ovozli xabar ekranda "0:00" bo'lib turardi va odam
   * uni buzilgan deb o'ylardi. Baza ham shu shartni tekshiradi.
   */
  .refine(
    (value) => Boolean(value.voiceUrl) === (value.voiceSeconds !== undefined),
    'Ovozli xabar davomiyligi berilmagan.',
  );

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** GET /api/v1/chat/conversations/{id}/stream */
export const streamQuerySchema = z.object({
  /**
   * Brauzer qaysi xabargacha olganini bildiradi.
   *
   * Shu vaqtdan KEYINGI o'zgarishlargina yuboriladi — butun suhbatni
   * qayta uzatish trafik va batareyani bekorga sarflardi.
   */
  since: z.coerce.number().int().min(0).optional(),
});

export type StreamQuery = z.infer<typeof streamQuerySchema>;
