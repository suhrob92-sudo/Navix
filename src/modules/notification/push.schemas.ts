import { z } from 'zod';

/**
 * Push obunasi uchun validatsiya.
 */

/**
 * Brauzer bergan obuna.
 *
 * ── Nima uchun manzil TEKSHIRILADI ────────────────────────────────────
 * `endpoint` — bu server o'zi so'rov yuboradigan manzil. Uni tekshirmasa,
 * yomon niyatli odam istalgan ichki manzilni yozib, serverni o'z ichki
 * tarmog'iga so'rov yuborishga majburlashi mumkin edi (SSRF).
 *
 * Shuning uchun faqat `https://` ga ruxsat beriladi.
 */
export const pushSubscribeSchema = z.object({
  endpoint: z
    .string()
    .trim()
    .max(500, 'Manzil juda uzun')
    .refine((value) => value.startsWith('https://'), "Push manzili faqat https bo'lishi mumkin"),

  keys: z.object({
    p256dh: z.string().trim().min(1).max(255),
    auth: z.string().trim().min(1).max(255),
  }),

  /**
   * Qurilma nomi BRAUZERDAN olinadi va ishonchsiz.
   *
   * Uzunligi cheklanadi va u faqat ro'yxatda ko'rsatiladi — hech qanday
   * qaror shu qiymatga tayanmaydi.
   */
  deviceLabel: z.string().trim().min(1).max(100).default('Qurilma'),
});

export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;

/** DELETE /api/v1/notifications/push */
export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().trim().min(1).max(500),
});

export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>;
