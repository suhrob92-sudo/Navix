import { z } from 'zod';

import { MAX_TOP_UP_SOM, MAX_TRANSFER_SOM, MIN_TOP_UP_SOM } from '@/lib/money';
import { paginationQuerySchema } from '@/lib/api/pagination';
import { phoneSchema } from '@/modules/auth/auth.schemas';

/**
 * Hamyon amallari uchun validatsiya.
 *
 * Muhim qoida: mijoz (brauzer) yuborgan hech bir summaga ISHONMAYMIZ.
 * Barcha chegaralar shu yerda, server tomonda tekshiriladi — aks holda
 * kimdir so'rovni o'zgartirib manfiy yoki juda katta summa yuborishi mumkin.
 */

/** To'ldirish usullari. Hozircha simulyatsiya, keyin real provayderlar ulanadi. */
export const TOP_UP_METHODS = [
  { value: 'CARD', label: 'Bank kartasi' },
  { value: 'PAYME', label: 'Payme' },
  { value: 'CLICK', label: 'Click' },
  { value: 'UZUM', label: 'Uzum Bank' },
] as const;

export type TopUpMethod = (typeof TOP_UP_METHODS)[number]['value'];

const topUpMethodSchema = z.enum(['CARD', 'PAYME', 'CLICK', 'UZUM'], {
  message: "To'lov usulini tanlang",
});

/**
 * Summa — SO'MDA, butun son.
 *
 * Nima uchun tiyin emas: foydalanuvchi so'mda o'ylaydi. Tiyinga o'girish
 * server tomonda, bitta joyda bajariladi — shunda xato ehtimoli kam.
 */
function amountSchema(min: number, max: number) {
  return z
    .number({ message: 'Summani kiriting' })
    .int("Summa butun so'mda bo'lishi kerak")
    .min(min, `Eng kam summa ${new Intl.NumberFormat('uz-UZ').format(min)} so'm`)
    .max(max, `Eng ko'p summa ${new Intl.NumberFormat('uz-UZ').format(max)} so'm`);
}

/**
 * Takroriy so'rovni aniqlash kaliti (idempotency key).
 *
 * Nima uchun kerak: telefon internetida so'rov yuborilib, javob yo'qolishi
 * mumkin. Foydalanuvchi tugmani yana bosadi — va pul IKKI MARTA yechiladi.
 * Bir xil kalit bilan kelgan ikkinchi so'rov yangi amal yaratmaydi, balki
 * birinchisining natijasini qaytaradi.
 */
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, 'Kalit juda qisqa')
  .max(100, 'Kalit juda uzun')
  .regex(/^[A-Za-z0-9_-]+$/, "Kalitda faqat harf, raqam, '-' va '_' ishlatiladi");

/** POST /api/v1/wallet/topup */
export const topUpSchema = z.object({
  amount: amountSchema(MIN_TOP_UP_SOM, MAX_TOP_UP_SOM),
  method: topUpMethodSchema,
  idempotencyKey: idempotencyKeySchema,
});

export type TopUpInput = z.infer<typeof topUpSchema>;

/** POST /api/v1/wallet/transfer */
export const transferSchema = z.object({
  phone: phoneSchema,
  amount: amountSchema(MIN_TOP_UP_SOM, MAX_TRANSFER_SOM),
  note: z.string().trim().max(140, 'Izoh 140 ta belgidan oshmasligi kerak').optional(),
  idempotencyKey: idempotencyKeySchema,
});

export type TransferInput = z.infer<typeof transferSchema>;

/** Tarixni filtrlash uchun turlar. */
export const TRANSACTION_TYPE_FILTERS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'TOP_UP', label: "To'ldirish" },
  { value: 'PAYMENT', label: "To'lovlar" },
  { value: 'TRANSFER', label: "O'tkazmalar" },
  { value: 'REFUND', label: 'Qaytarilgan' },
] as const;

/** GET /api/v1/wallet/transactions */
export const transactionQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['ALL', 'TOP_UP', 'WITHDRAWAL', 'PAYMENT', 'REFUND', 'TRANSFER', 'BONUS']).default('ALL'),
});

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;

/**
 * Brauzer tomonida takrorlanmas kalit yaratadi.
 *
 * `crypto.randomUUID` barcha zamonaviy brauzerlarda bor; bo'lmagan holat
 * uchun oddiy zaxira ishlatiladi (kalit faqat takrorni aniqlash uchun,
 * kriptografik sir emas).
 */
export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
