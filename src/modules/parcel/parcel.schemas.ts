import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';
import { DELIVERY_REGIONS, DELIVERY_TARIFF } from '@/config/delivery';
import { phoneSchema } from '@/modules/auth/auth.schemas';

/**
 * Posilka jo'natish uchun validatsiya.
 *
 * ── Bosh qoida: NARX MIJOZDAN KELMAYDI ────────────────────────────────
 * So'rovda summa yo'q va bo'lmasligi ham kerak. U serverda, tarif
 * bo'yicha qayta hisoblanadi.
 *
 * Aks holda so'rovni tahrirlab, Toshkentdan Xorazmga 100 so'mga
 * posilka jo'natish mumkin bo'lardi. Bu — Marketplace'dagi bilan
 * bir xil qoida.
 */

const regionSchema = z.enum(DELIVERY_REGIONS, { message: 'Hududni tanlang' });

const addressSchema = z
  .string()
  .trim()
  .min(10, "Manzilni to'liqroq yozing — kuryer topa olishi kerak")
  .max(300, 'Manzil juda uzun');

const noteSchema = z.string().trim().max(300, 'Izoh juda uzun');

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, 'Kalit juda qisqa')
  .max(100, 'Kalit juda uzun')
  .regex(/^[A-Za-z0-9_-]+$/, "Kalitda faqat harf, raqam, '-' va '_' ishlatiladi");

/**
 * Og'irlik GRAMMDA.
 *
 * Kilogrammda so'ralsa kasr son kelardi (1.5 kg) va u bazada
 * yaxlitlanib, narx bilan mos kelmay qolardi. Grammda esa hamma
 * narsa butun son.
 */
const weightSchema = z
  .number({ message: "Og'irlikni kiriting" })
  .int("Og'irlik grammda, butun son bo'lishi kerak")
  .min(DELIVERY_TARIFF.minWeightGrams, `Eng kami ${DELIVERY_TARIFF.minWeightGrams} gramm`)
  .max(
    DELIVERY_TARIFF.maxWeightGrams,
    `Eng ko'pi ${DELIVERY_TARIFF.maxWeightGrams / 1_000} kg — og'irrog'i uchun biz bilan bog'laning`,
  );

/** GET /api/v1/parcels/quote — narxni oldindan hisoblash. */
export const parcelQuoteSchema = z.object({
  fromRegion: regionSchema,
  toRegion: regionSchema,
  weightGrams: z.coerce.number().pipe(weightSchema),
});

export type ParcelQuoteInput = z.infer<typeof parcelQuoteSchema>;

/** POST /api/v1/parcels */
export const createParcelSchema = z.object({
  fromRegion: regionSchema,
  fromAddress: addressSchema,
  fromNote: noteSchema.optional(),

  toRegion: regionSchema,
  toAddress: addressSchema,
  toNote: noteSchema.optional(),

  /**
   * Qabul qiluvchi — u ilovada bo'lmasligi mumkin.
   *
   * Shuning uchun ID emas, ism va telefon so'raladi. Telefon
   * majburiy: kuryer yetib borgach qo'ng'iroq qiladi.
   */
  recipientName: z.string().trim().min(2, 'Qabul qiluvchining ismini yozing').max(120, 'Ism juda uzun'),
  recipientPhone: phoneSchema,

  /**
   * Ichida nima bor.
   *
   * Majburiy: kuryer nima olib ketayotganini bilishi kerak —
   * mo'rt buyum bo'lsa ehtiyot bo'ladi, taqiqlangan narsa bo'lsa
   * rad etadi.
   */
  description: z.string().trim().min(3, 'Nima jo\'natayotganingizni yozing').max(300, 'Tavsif juda uzun'),

  weightGrams: weightSchema,

  idempotencyKey: idempotencyKeySchema,
});

export type CreateParcelInput = z.infer<typeof createParcelSchema>;

/** GET /api/v1/parcels */
export const parcelQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ALL', 'ACTIVE', 'DELIVERED', 'CANCELLED']).default('ALL'),
});

export type ParcelQuery = z.infer<typeof parcelQuerySchema>;

/** POST /api/v1/parcels/{id}/cancel */
export const cancelParcelSchema = z.object({
  reason: z.string().trim().min(3, 'Sababni yozing').max(255, 'Sabab juda uzun').optional(),
});

export type CancelParcelInput = z.infer<typeof cancelParcelSchema>;
