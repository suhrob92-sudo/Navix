import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';

/**
 * Kuryer kabineti uchun validatsiya.
 *
 * MUHIM: hech bir so'rovda KURYER ID'si yo'q. "Menga tegishli
 * topshiriqlar" degan so'rov tokendagi foydalanuvchiga tayanadi —
 * begona topshiriqni so'rashning iloji yo'q.
 */

/** GET /api/v1/courier/deliveries */
export const deliveryQuerySchema = paginationQuerySchema.extend({
  /**
   * `AVAILABLE` — umumiy ro'yxat (egasiz topshiriqlar).
   * Qolganlari — kuryerning O'Z topshiriqlari.
   */
  status: z.enum(['AVAILABLE', 'ACTIVE', 'DELIVERED', 'ALL']).default('ACTIVE'),
});

export type DeliveryQuery = z.infer<typeof deliveryQuerySchema>;

/**
 * PATCH /api/v1/courier/deliveries/[id]
 *
 * `ACCEPTED` bu yerda YO'Q: topshiriqni olish alohida endpoint
 * (`POST .../accept`), chunki u raqobatli amal — bir vaqtda bir necha
 * kuryer bosishi mumkin va javob ham boshqacha ("kimdir ulgurdi").
 */
export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['PICKED_UP', 'DELIVERED', 'OFFERED'], { message: "Holat noto'g'ri" }),
  /** Topshiriqdan voz kechishda sabab. */
  reason: z.string().trim().min(3, 'Sababni yozing').max(255, 'Sabab juda uzun').optional(),
});

export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>;
