import { z } from 'zod';

import {
  LIVE_DESCRIPTION_MAX_LENGTH,
  LIVE_MAX_DAYS_AHEAD,
  LIVE_MIN_LEAD_MINUTES,
  LIVE_STATUSES,
  LIVE_TITLE_MAX_LENGTH,
} from '@/config/live';

/**
 * Jonli efir e'lonlari uchun validatsiya.
 */

/**
 * Boshlanish vaqti.
 *
 * ── Nima uchun chegaralar SXEMADA ─────────────────────────────────────
 * Ularni faqat xizmatda tekshirish ham mumkin edi. Lekin sxema xato
 * matnini AYNAN maydonga bog'lab qaytaradi va ekranda u to'g'ri
 * joyda chiqadi.
 *
 * ── Nima uchun vaqt SATR sifatida keladi ──────────────────────────────
 * JSON da sana turi yo'q. Brauzer `toISOString()` yuboradi va u
 * doim UTC — ya'ni telefondagi vaqt mintaqasi natijani buzmaydi.
 */
const scheduledAtField = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Vaqt noto'g'ri")
  .transform((value) => new Date(value))
  .refine(
    (date) => date.getTime() >= Date.now() + LIVE_MIN_LEAD_MINUTES * 60 * 1000,
    `Efir kamida ${LIVE_MIN_LEAD_MINUTES} daqiqadan keyin boshlanishi kerak.`,
  )
  .refine(
    (date) => date.getTime() <= Date.now() + LIVE_MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000,
    `Efirni ${LIVE_MAX_DAYS_AHEAD} kundan uzoqqa rejalashtirib bo'lmaydi.`,
  );

export const createLiveSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Sarlavha bo'sh bo'lmasligi kerak.")
    .max(LIVE_TITLE_MAX_LENGTH, `Sarlavha ${LIVE_TITLE_MAX_LENGTH} belgidan oshmasligi kerak.`),
  description: z
    .string()
    .trim()
    .max(LIVE_DESCRIPTION_MAX_LENGTH, `Izoh ${LIVE_DESCRIPTION_MAX_LENGTH} belgidan oshmasligi kerak.`)
    .optional(),
  scheduledAt: scheduledAtField,
});

export type CreateLiveInput = z.infer<typeof createLiveSchema>;

/**
 * Holatni o'zgartirish.
 *
 * ── Nima uchun alohida manzil, oddiy tahrirlash emas ──────────────────
 * Holat o'zgarishi ODDIY tahrirlash emas: u xabar yuboradi (efir
 * boshlandi) va uni ORQAGA qaytarib bo'lmaydi.
 *
 * Sarlavhani tuzatish bilan bir so'rovga qo'shilsa, tasodifan
 * bosilgan tugma yuzlab odamga xabar yuborib yuborardi.
 */
export const liveStatusSchema = z.object({
  status: z.enum(LIVE_STATUSES),
});

export type LiveStatusInput = z.infer<typeof liveStatusSchema>;

/** Ro'yxat uchun so'rov. */
export const liveQuerySchema = z.object({
  /**
   * Faqat O'Z efirlarim.
   *
   * Bloger o'zining bekor qilingan va tugagan efirlarini ham
   * ko'rishi kerak — umumiy ro'yxatda ular yo'q.
   */
  mine: z
    .enum(['0', '1'])
    .default('0')
    .transform((value) => value === '1'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type LiveQuery = z.infer<typeof liveQuerySchema>;
