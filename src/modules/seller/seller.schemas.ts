import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';

/**
 * Sotuvchi kabineti uchun validatsiya.
 *
 * MUHIM: bu yerda DO'KON ID'si yo'q joyda ham egalik serverda
 * tekshiriladi. Ya'ni "menga tegishli buyurtmalar" degan so'rov
 * mijozdan kelgan ID'ga emas, tokendagi foydalanuvchiga tayanadi.
 */

/**
 * Narx chegaralari — SO'MDA (bazada tiyinga o'giriladi).
 *
 * Yuqori chegara 1 milliard so'm: marketplace'da avtomobil ham
 * sotilishi mumkin, lekin undan kattasi deyarli har doim xato
 * kiritish (masalan tiyinni so'm deb yozish).
 */
const MIN_PRICE_SOM = 1_000;
const MAX_PRICE_SOM = 1_000_000_000;

const priceSomSchema = z
  .number({ message: 'Narxni kiriting' })
  .int("Narx butun so'mda bo'lishi kerak")
  .min(MIN_PRICE_SOM, `Eng kami ${MIN_PRICE_SOM} so'm`)
  .max(MAX_PRICE_SOM, 'Narx juda katta');

/**
 * Omborda nechta bor.
 *
 * Yuqori chegara 100 000: undan ko'p zaxira ulgurji savdo demak va
 * u boshqacha ishlaydi. Chegarasiz qoldirilsa, bitta noto'g'ri
 * bosilgan raqam butun katalogni buzadi.
 */
const MAX_STOCK = 100_000;

const stockSchema = z
  .number({ message: 'Zaxirani kiriting' })
  .int("Son butun bo'lishi kerak")
  .min(0, "Manfiy bo'lishi mumkin emas")
  .max(MAX_STOCK, `Ko'pi bilan ${MAX_STOCK} ta`);

const productNameSchema = z
  .string()
  .trim()
  .min(3, 'Nom juda qisqa')
  .max(160, 'Nom juda uzun');

const productDescriptionSchema = z.string().trim().max(1_000, 'Tavsif juda uzun');

/** GET /api/v1/seller/orders */
export const sellerOrderQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum(['ACTIVE', 'ALL', 'PENDING', 'CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
    .default('ACTIVE'),
  /** Faqat bitta do'kon bo'yicha. Berilmasa — barcha do'konlari. */
  shopId: z.uuid().optional(),
});

export type SellerOrderQuery = z.infer<typeof sellerOrderQuerySchema>;

/**
 * PATCH /api/v1/seller/orders/[id]
 *
 * Faqat KEYINGI holat yuboriladi. Ruxsat etilganini server
 * `canTransition()` orqali tekshiradi — mijoz jadvalni bilmasligi ham
 * mumkin, lekin uni chetlab o'ta olmaydi.
 */
export const updateSellerOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED', 'CANCELLED'], {
    message: "Holat noto'g'ri",
  }),
  /** Rad etishda sabab — xaridor nima uchun bekor bo'lganini bilishi kerak. */
  reason: z.string().trim().min(3, 'Sababni yozing').max(255, 'Sabab juda uzun').optional(),
});

export type UpdateSellerOrderStatusInput = z.infer<typeof updateSellerOrderStatusSchema>;

/** PATCH /api/v1/seller/shops/[id] */
export const updateSellerShopSchema = z.object({
  /** Hozir buyurtma qabul qilinyaptimi. */
  isOpen: z.boolean().optional(),
  deliveryDays: z
    .number()
    .int('Butun son kiriting')
    .min(1, 'Eng kami 1 kun')
    .max(30, "Ko'pi bilan 30 kun")
    .optional(),
});

export type UpdateSellerShopInput = z.infer<typeof updateSellerShopSchema>;

/**
 * POST /api/v1/seller/shops/[id]/products — yangi mahsulot.
 *
 * `slug` va `searchName` bu yerda YO'Q: ikkalasini ham server nomdan
 * hisoblaydi. Mijozga ishonib topshirilsa, ikki mahsulot bir xil
 * manzilga tushib qolardi yoki qidiruv ustuni nomga mos kelmasdi.
 */
export const createSellerProductSchema = z.object({
  name: productNameSchema,
  description: productDescriptionSchema.optional(),
  categoryId: z.uuid({ message: 'Toifani tanlang' }),
  priceSom: priceSomSchema,
  /** Chegirmadan oldingi narx — faqat ko'rsatish uchun. */
  oldPriceSom: priceSomSchema.optional(),
  stock: stockSchema,
});

export type CreateSellerProductInput = z.infer<typeof createSellerProductSchema>;

/**
 * PATCH /api/v1/seller/products/[id]
 *
 * `oldPriceSom` da `null` ham qabul qilinadi: chegirma tugaganda eski
 * narxni O'CHIRISH kerak bo'ladi, `undefined` esa "tegmadim" degani.
 */
export const updateSellerProductSchema = z.object({
  name: productNameSchema.optional(),
  description: productDescriptionSchema.nullable().optional(),
  priceSom: priceSomSchema.optional(),
  oldPriceSom: priceSomSchema.nullable().optional(),
  stock: stockSchema.optional(),
  /** Sotuvdan vaqtincha olib qo'yish. */
  isActive: z.boolean().optional(),
});

export type UpdateSellerProductInput = z.infer<typeof updateSellerProductSchema>;
