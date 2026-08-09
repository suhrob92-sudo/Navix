import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';
import { usernameParamSchema } from '@/modules/profile/social.schemas';

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
