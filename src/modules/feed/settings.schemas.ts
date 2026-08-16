import { z } from 'zod';

import { POST_CATEGORY_VALUES } from '@/modules/feed/feed.types';
import { AUDIENCE_SCOPES } from '@/modules/feed/settings.types';

/**
 * Feed sozlamalari uchun validatsiya.
 *
 * ── Nima uchun HAMMA maydon ixtiyoriy ─────────────────────────────────
 * Ekranda bitta tugma bosiladi — masalan "Izohlar" bildirishnomasi
 * o'chiriladi. Butun sozlamani qayta yuborish shart emas: mobil
 * trafik bekorga sarflanardi va ikki ekran bir vaqtda ochiq bo'lsa,
 * biri ikkinchisining o'zgarishini bekor qilib yuborardi.
 */
const categoryList = z
  .array(z.enum(POST_CATEGORY_VALUES))
  /**
   * Takrorlar TOZALANADI.
   *
   * Brauzer bir bo'limni ikki marta yuborishi mumkin (tez ikki
   * bosish). Bazada u ikkita qator bo'lib qolardi va "nechta
   * qiziqish tanlangan" degan son yolg'on chiqardi.
   */
  .transform((values) => [...new Set(values)])
  .refine(
    (values) => values.length <= POST_CATEGORY_VALUES.length,
    "Bo'limlar soni ro'yxatdagidan ko'p bo'lishi mumkin emas.",
  );

export const feedSettingsSchema = z.object({
  interests: categoryList.optional(),
  notInterested: categoryList.optional(),
  sensitiveFilter: z.boolean().optional(),
  profileVisibility: z.enum(AUDIENCE_SCOPES).optional(),
  commentScope: z.enum(AUDIENCE_SCOPES).optional(),
  followScope: z.enum(AUDIENCE_SCOPES).optional(),
  notifyLike: z.boolean().optional(),
  notifyComment: z.boolean().optional(),
  notifyFollow: z.boolean().optional(),
  notifyMention: z.boolean().optional(),
  notifyLive: z.boolean().optional(),
});

export type FeedSettingsInput = z.infer<typeof feedSettingsSchema>;
