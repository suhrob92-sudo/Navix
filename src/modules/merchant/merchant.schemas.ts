import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';

/**
 * Restoran kabineti uchun validatsiya.
 *
 * MUHIM: bu yerda RESTORAN ID'si yo'q joyda ham egalik serverda
 * tekshiriladi. Ya'ni "menga tegishli buyurtmalar" degan so'rov
 * mijozdan kelgan ID'ga emas, tokendagi foydalanuvchiga tayanadi.
 */

/** GET /api/v1/merchant/orders */
export const merchantOrderQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum(['ACTIVE', 'ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'DELIVERED', 'CANCELLED'])
    .default('ACTIVE'),
  /** Faqat bitta restoran bo'yicha. Berilmasa — barcha restoranlari. */
  restaurantId: z.uuid().optional(),
});

export type MerchantOrderQuery = z.infer<typeof merchantOrderQuerySchema>;

/**
 * PATCH /api/v1/merchant/orders/[id]
 *
 * Faqat KEYINGI holat yuboriladi. Ruxsat etilganini server
 * `canTransition()` orqali tekshiradi — mijoz jadvalni bilmasligi ham
 * mumkin, lekin uni chetlab o'ta olmaydi.
 */
export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PREPARING', 'DELIVERING', 'DELIVERED', 'CANCELLED'], {
    message: "Holat noto'g'ri",
  }),
  /** Rad etishda sabab — mijoz nima uchun bekor bo'lganini bilishi kerak. */
  reason: z.string().trim().min(3, 'Sababni yozing').max(255, 'Sabab juda uzun').optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

/** PATCH /api/v1/merchant/restaurants/[id] */
export const updateRestaurantSchema = z.object({
  /** Hozir buyurtma qabul qilinyaptimi. */
  isOpen: z.boolean().optional(),
  deliveryMinutes: z
    .number()
    .int('Butun son kiriting')
    .min(10, 'Eng kami 10 daqiqa')
    .max(180, "Ko'pi bilan 180 daqiqa")
    .optional(),
});

export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;

/** PATCH /api/v1/merchant/menu-items/[id] */
export const updateMenuItemSchema = z.object({
  /** Tugab qolgan taomni vaqtincha o'chirish. */
  isAvailable: z.boolean().optional(),
  /**
   * Narx SO'MDA. Bazada tiyinga o'giriladi.
   *
   * Chegara bor: nol narx bepul ovqat degani, juda katta narx esa
   * ko'pincha xato kiritish (masalan tiyinni so'm deb yozish).
   */
  priceSom: z
    .number({ message: 'Narxni kiriting' })
    .int("Narx butun so'mda bo'lishi kerak")
    .min(1_000, "Eng kami 1 000 so'm")
    .max(50_000_000, 'Narx juda katta')
    .optional(),
});

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
