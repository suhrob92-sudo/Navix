import { z } from 'zod';

import {
  DECISION_NOTE_MAX_LENGTH,
  RETURN_COMMENT_MAX_LENGTH,
  RETURN_REASONS,
} from '@/config/order-return';

/**
 * Qaytarish so'rovlarining shakli.
 */

const reasonValues = RETURN_REASONS.map((option) => option.value) as [string, ...string[]];

/** POST /api/v1/market/orders/[id]/return */
export const createReturnSchema = z.object({
  reason: z.enum(reasonValues, { message: 'Sababni tanlang' }),
  comment: z.string().trim().max(RETURN_COMMENT_MAX_LENGTH).optional(),
  /**
   * Qaysi qatorlar qaytarilmoqda.
   *
   * ── Nima uchun ro'yxat MAJBURIY ─────────────────────────────────────
   * "Butun buyurtmani qaytar" degan qisqa yo'l ham qo'shsa bo'lardi.
   *
   * Lekin o'shanda ikkita yo'l paydo bo'lardi va ularning har biri
   * pulni boshqacha hisoblardi. Bitta yo'l — bitta hisob.
   */
  items: z
    .array(
      z.object({
        orderItemId: z.uuid("Buyurtma qatori ID noto'g'ri"),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, 'Kamida bitta mahsulotni tanlang'),
});

/** PATCH /api/v1/seller/returns/[id] */
export const decideReturnSchema = z
  .object({
    approve: z.boolean(),
    note: z.string().trim().max(DECISION_NOTE_MAX_LENGTH).optional(),
  })
  .refine(
    (value) => value.approve || (value.note !== undefined && value.note.length > 0),
    {
      /*
        Rad etishda SABAB majburiy.

        Sababsiz rad etish xaridor uchun eng yomon tajriba: u nima
        qilish kerakligini ham, kim bilan gaplashishni ham bilmaydi.
      */
      message: 'Rad etish sababini yozing',
      path: ['note'],
    },
  );

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
export type DecideReturnInput = z.infer<typeof decideReturnSchema>;
