import { z } from 'zod';

import { WAITLIST_SOURCES } from '@/config/waitlist';
import { phoneSchema } from '@/modules/auth/auth.schemas';

/**
 * Navbatga yozilish uchun validatsiya.
 *
 * ── Nima uchun faqat TELEFON majburiy ─────────────────────────────────
 * Har bir qo'shimcha maydon yozilishni kamaytiradi. Ilova ochilganda
 * odamga xabar berish uchun bitta telefon raqami yetarli — qolgani
 * ixtiyoriy.
 */
export const joinWaitlistSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().min(2, 'Ism juda qisqa').max(120, 'Ism juda uzun').optional(),
  city: z.string().trim().min(2, 'Shahar nomi juda qisqa').max(80, 'Shahar nomi juda uzun').optional(),
  /**
   * Qayerdan keldi — manzildagi `?from=` dan olinadi.
   *
   * Ro'yxat YOPIQ (`enum`): ochiq matn qabul qilinsa, havolani
   * tahrirlab bazaga xohlagan yozuvni tiqish mumkin bo'lardi.
   */
  source: z.enum(WAITLIST_SOURCES, { message: "Manba noma'lum" }).optional(),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
