import { z } from 'zod';

import { ERROR_LIMITS } from '@/modules/error-log/error-log.types';

/**
 * Xatolar jurnali uchun validatsiya.
 */

export const errorLogQuerySchema = z.object({
  /** Sukut bo'yicha faqat ko'rib chiqilmagan xatolar. */
  status: z.enum(['OPEN', 'RESOLVED', 'ALL']).default('OPEN'),
  source: z.enum(['SERVER', 'BROWSER', 'ALL']).default('ALL'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type ErrorLogQuery = z.infer<typeof errorLogQuerySchema>;

export const resolveErrorSchema = z.object({
  isResolved: z.boolean(),
});

export type ResolveErrorInput = z.infer<typeof resolveErrorSchema>;

/**
 * Brauzerdan keladigan xato hisoboti.
 *
 * ── Nima uchun chegaralar QATTIQ ──────────────────────────────────────
 * Bu manzil kirish talab qilmaydi: xato foydalanuvchi tizimga
 * kirgunga qadar ham yuz berishi mumkin. Ya'ni unga istalgan odam
 * so'rov yubora oladi.
 *
 * Shuning uchun har bir maydon uzunligi cheklangan va matn bazaga
 * o'z holicha emas, qisqartirilib yoziladi.
 */
export const clientErrorSchema = z.object({
  kind: z.string().trim().max(ERROR_LIMITS.kind).default('Error'),
  message: z.string().trim().min(1).max(ERROR_LIMITS.message),
  path: z.string().trim().max(500).default('/'),
  stack: z.string().trim().max(ERROR_LIMITS.stack).optional(),
});

export type ClientErrorInput = z.infer<typeof clientErrorSchema>;
