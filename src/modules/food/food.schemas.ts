import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';

/**
 * Ovqat moduli uchun validatsiya.
 *
 * ── Eng muhim qoida: NARX MIJOZDAN OLINMAYDI ──────────────────────────
 * Savatdan faqat taom ID'si va SONI keladi. Narx, yetkazish haqi va
 * umumiy summa serverda bazadan qayta hisoblanadi.
 *
 * Aks holda foydalanuvchi so'rovni tahrirlab, 55 000 so'mlik pitsani
 * 1 so'mga "sotib olishi" mumkin edi.
 */

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, 'Kalit juda qisqa')
  .max(100, 'Kalit juda uzun')
  .regex(/^[A-Za-z0-9_-]+$/, "Kalitda faqat harf, raqam, '-' va '_' ishlatiladi");

/**
 * Bitta buyurtmadagi eng ko'p taom turi va har biridan eng ko'p dona.
 *
 * Chegara kerak: chegarasiz so'rovda 100 000 ta taom bo'lishi va
 * server hisoblashda qotib qolishi mumkin.
 */
export const MAX_CART_LINES = 30;
export const MAX_ITEM_QUANTITY = 20;

export const cartLineSchema = z.object({
  menuItemId: z.uuid({ message: "Taom noto'g'ri tanlangan" }),
  quantity: z
    .number({ message: 'Sonini kiriting' })
    .int("Son butun bo'lishi kerak")
    .min(1, 'Kamida 1 ta')
    .max(MAX_ITEM_QUANTITY, `Ko'pi bilan ${MAX_ITEM_QUANTITY} ta`),
});

export type CartLineInput = z.infer<typeof cartLineSchema>;

/** POST /api/v1/food/orders */
export const createFoodOrderSchema = z.object({
  restaurantId: z.uuid({ message: "Restoran noto'g'ri tanlangan" }),
  addressId: z.uuid({ message: 'Manzilni tanlang' }),
  items: z
    .array(cartLineSchema)
    .min(1, "Savat bo'sh")
    .max(MAX_CART_LINES, `Ko'pi bilan ${MAX_CART_LINES} xil taom`),
  deliveryNote: z.string().trim().max(255, 'Izoh juda uzun').optional(),
  idempotencyKey: idempotencyKeySchema,
});

export type CreateFoodOrderInput = z.infer<typeof createFoodOrderSchema>;

/** POST /api/v1/food/orders/[id]/cancel */
export const cancelFoodOrderSchema = z.object({
  reason: z.string().trim().max(255, 'Sabab juda uzun').optional(),
});

export type CancelFoodOrderInput = z.infer<typeof cancelFoodOrderSchema>;

/** GET /api/v1/food/restaurants */
export const restaurantQuerySchema = z.object({
  cuisine: z.string().trim().min(2).max(60).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export type RestaurantQuery = z.infer<typeof restaurantQuerySchema>;

/** GET /api/v1/food/orders */
export const foodOrderQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ALL', 'ACTIVE', 'DELIVERED', 'CANCELLED']).default('ALL'),
});

export type FoodOrderQuery = z.infer<typeof foodOrderQuerySchema>;
