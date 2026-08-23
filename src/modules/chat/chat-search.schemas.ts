import { z } from 'zod';

import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from '@/config/message-search';

/**
 * GET /api/v1/chat/search — xabarlarni qidirish.
 *
 * ── Nima uchun eng qisqa uzunlik SXEMADA ──────────────────────────────
 * Bitta harf bo'yicha qidiruv deyarli har bir xabarni topadi va eng
 * og'ir so'rov bo'ladi: indeks yordam bermaydi, butun jadval o'qiladi.
 *
 * Uni brauzerda to'sish yetarli emas — so'rovni to'g'ridan-to'g'ri
 * yuborish mumkin.
 */
export const messageSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(SEARCH_MIN_LENGTH, "Qidiruv so'zi juda qisqa")
    .max(SEARCH_MAX_LENGTH, "Qidiruv so'zi juda uzun"),
  /**
   * Berilsa — faqat SHU suhbat ichida qidiriladi.
   *
   * A'zolik server tomonda tekshiriladi: begona suhbat ID'sini
   * yuborish "topilmadi" bilan tugaydi.
   */
  conversationId: z.uuid("Suhbat ID noto'g'ri").optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type MessageSearchQuery = z.infer<typeof messageSearchQuerySchema>;
