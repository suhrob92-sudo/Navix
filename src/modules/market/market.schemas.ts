import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';

/**
 * Marketplace uchun validatsiya.
 *
 * ── Ovqat moduli bilan bir xil bosh qoida ─────────────────────────────
 * Savatdan faqat mahsulot ID'si va SONI keladi. Narx, yetkazish haqi va
 * umumiy summa serverda bazadan qayta hisoblanadi. Aks holda so'rovni
 * tahrirlab 4 million so'mlik telefonni 1 so'mga "sotib olish" mumkin
 * bo'lardi.
 */

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, 'Kalit juda qisqa')
  .max(100, 'Kalit juda uzun')
  .regex(/^[A-Za-z0-9_-]+$/, "Kalitda faqat harf, raqam, '-' va '_' ishlatiladi");

/**
 * Bitta buyurtmadagi eng ko'p mahsulot turi va har biridan eng ko'p dona.
 *
 * ── Nima uchun ovqatdan kamroq ────────────────────────────────────────
 * Ovqatda bitta taomdan 20 tagacha olish odatiy (idorada 15 kishi).
 * Mahsulotda esa 10 tadan ko'p buyurtma deyarli har doim xato yoki
 * qayta sotish — bunday holat sotuvchi bilan alohida kelishiladi.
 */
export const MAX_CART_LINES = 30;
export const MAX_ITEM_QUANTITY = 10;

export const cartLineSchema = z.object({
  productId: z.uuid({ message: "Mahsulot noto'g'ri tanlangan" }),
  quantity: z
    .number({ message: 'Sonini kiriting' })
    .int("Son butun bo'lishi kerak")
    .min(1, 'Kamida 1 ta')
    .max(MAX_ITEM_QUANTITY, `Ko'pi bilan ${MAX_ITEM_QUANTITY} ta`),
});

export type CartLineInput = z.infer<typeof cartLineSchema>;

/** POST /api/v1/market/orders */
export const createMarketOrderSchema = z.object({
  shopId: z.uuid({ message: "Do'kon noto'g'ri tanlangan" }),
  addressId: z.uuid({ message: 'Manzilni tanlang' }),
  items: z
    .array(cartLineSchema)
    .min(1, "Savat bo'sh")
    .max(MAX_CART_LINES, `Ko'pi bilan ${MAX_CART_LINES} xil mahsulot`),
  deliveryNote: z.string().trim().max(255, 'Izoh juda uzun').optional(),
  idempotencyKey: idempotencyKeySchema,
});

export type CreateMarketOrderInput = z.infer<typeof createMarketOrderSchema>;

/** POST /api/v1/market/orders/[id]/cancel */
export const cancelMarketOrderSchema = z.object({
  reason: z.string().trim().max(255, 'Sabab juda uzun').optional(),
});

export type CancelMarketOrderInput = z.infer<typeof cancelMarketOrderSchema>;

/**
 * GET /api/v1/market/products
 *
 * Narx chegaralari SO'MDA keladi — manzil satrida tiyin yozish
 * foydalanuvchi uchun tushunarsiz bo'lardi.
 */
export const productQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  shop: z.string().trim().min(1).max(60).optional(),
  minPriceSom: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  maxPriceSom: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  /** Faqat sotuvda borlari. */
  inStock: z
    .union([z.literal('true'), z.literal('false')])
    .transform((value) => value === 'true')
    .optional(),
  sort: z.enum(['popular', 'cheap', 'expensive', 'new']).default('popular'),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

/** GET /api/v1/market/orders */
export const marketOrderQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ALL', 'ACTIVE', 'DELIVERED', 'CANCELLED']).default('ALL'),
});

export type MarketOrderQuery = z.infer<typeof marketOrderQuerySchema>;
