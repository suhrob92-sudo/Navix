import { z } from 'zod';

/**
 * GET /api/v1/orders — yagona buyurtmalar tarixi.
 *
 * ── Nima uchun `pageSize` yo'q ────────────────────────────────────────
 * Ro'yxat beshta manbadan yig'iladi va har biridan `sahifa × o'lcham`
 * tadan olinadi. O'lchamni mijoz tanlay olsa, u 500 deb yuborib,
 * beshta jadvaldan 500 tadan yozuv so'rashi mumkin bo'lardi.
 *
 * Shuning uchun o'lcham serverda qat'iy belgilangan.
 */
export const ordersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(50).default(1),
  filter: z.enum(['ALL', 'ACTIVE', 'FINISHED']).default('ALL'),
  kind: z.enum(['ALL', 'FOOD', 'MARKET', 'HOTEL', 'TRAVEL', 'PARCEL']).default('ALL'),
});

export type OrdersQuery = z.infer<typeof ordersQuerySchema>;
