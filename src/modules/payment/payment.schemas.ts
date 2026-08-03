import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';

/**
 * Xizmat to'lovlari uchun validatsiya.
 *
 * Muhim: summa chegaralari HAR PROVAYDER uchun har xil (gaz va TV
 * bir xil emas). Shuning uchun ular bu yerda emas, xizmat qatlamida
 * bazadan o'qib tekshiriladi. Bu yerda faqat umumiy shakl tekshiriladi.
 */

/** Hisob raqami — faqat raqam va harflar; aniq naqsh provayderdan olinadi. */
const accountNumberSchema = z
  .string()
  .trim()
  .min(3, 'Hisob raqami juda qisqa')
  .max(60, 'Hisob raqami juda uzun')
  .regex(/^[A-Za-z0-9-]+$/, "Hisob raqamida faqat harf, raqam va '-' bo'lishi mumkin");

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, 'Kalit juda qisqa')
  .max(100, 'Kalit juda uzun')
  .regex(/^[A-Za-z0-9_-]+$/, "Kalitda faqat harf, raqam, '-' va '_' ishlatiladi");

/** GET /api/v1/payments/providers */
export const providerQuerySchema = z.object({
  category: z.enum(['ALL', 'UTILITY', 'INTERNET', 'MOBILE', 'TV']).default('ALL'),
});

export type ProviderQuery = z.infer<typeof providerQuerySchema>;

/** POST /api/v1/payments */
export const createPaymentSchema = z.object({
  providerId: z.uuid({ message: "Xizmat noto'g'ri tanlangan" }),
  accountNumber: accountNumberSchema,
  /** Summa SO'MDA, butun son. Chegaralar provayderga qarab tekshiriladi. */
  amount: z
    .number({ message: 'Summani kiriting' })
    .int("Summa butun so'mda bo'lishi kerak")
    .positive("Summa noldan katta bo'lishi kerak"),
  /** Belgilansa — to'lovdan keyin hisob avtomatik saqlanadi. */
  saveAccount: z.boolean().default(false),
  /** Saqlanadigan hisob nomi (`saveAccount` true bo'lganda). */
  accountLabel: z.string().trim().min(2, 'Kamida 2 ta belgi').max(60, 'Juda uzun').optional(),
  idempotencyKey: idempotencyKeySchema,
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

/** POST /api/v1/payments/accounts */
export const createSavedAccountSchema = z.object({
  providerId: z.uuid({ message: "Xizmat noto'g'ri tanlangan" }),
  accountNumber: accountNumberSchema,
  label: z.string().trim().min(2, 'Kamida 2 ta belgi kiriting').max(60, 'Juda uzun'),
});

export type CreateSavedAccountInput = z.infer<typeof createSavedAccountSchema>;

/** GET /api/v1/payments */
export const paymentHistoryQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ALL', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).default('ALL'),
});

export type PaymentHistoryQuery = z.infer<typeof paymentHistoryQuerySchema>;
