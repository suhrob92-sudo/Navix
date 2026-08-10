import { z } from 'zod';

import { REPORT_REASONS, type ReportReasonName } from '@/modules/moderation/moderation.types';

/**
 * Shikoyat sabablari — Zod uchun.
 *
 * Ro'yxat `moderation.types.ts` dan olinadi: sabab bitta joyda
 * yoziladi, keyin UI ham, tekshiruv ham shundan foydalanadi.
 */
const REPORT_REASON_VALUES = REPORT_REASONS.map((item) => item.value) as [ReportReasonName, ...ReportReasonName[]];

/**
 * Izoh uzunligi.
 *
 * Bazadagi ustun ham shu chegara bilan yaratilgan — ikkalasi bir xil
 * bo'lmasa, baza xatosi foydalanuvchiga tushunarsiz ko'rinishda
 * chiqardi.
 */
const NOTE_MAX_LENGTH = 500;

export const reportUserSchema = z.object({
  reason: z.enum(REPORT_REASON_VALUES, { message: 'Shikoyat sababini tanlang.' }),
  note: z
    .string()
    .trim()
    .max(NOTE_MAX_LENGTH, `Izoh ${NOTE_MAX_LENGTH} belgidan oshmasligi kerak.`)
    .optional()
    /**
     * Bo'sh matn `undefined` ga aylantiriladi.
     *
     * Aks holda bazada bo'sh satrlar to'planardi va moderator "izoh
     * bor" deb o'ylab ochib ko'rardi.
     */
    .transform((value) => (value ? value : undefined)),
});

export type ReportUserInput = z.infer<typeof reportUserSchema>;

/**
 * Moderator ro'yxati uchun so'rov.
 *
 * Sukut bo'yicha faqat OCHIQ shikoyatlar ko'rsatiladi — moderatorning
 * ishi aynan shular bilan. Yopilganlari kerak bo'lganda so'raladi.
 */
export const adminReportQuerySchema = z.object({
  status: z.enum(['OPEN', 'REVIEWED', 'DISMISSED', 'ALL']).default('OPEN'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type AdminReportQuery = z.infer<typeof adminReportQuerySchema>;

/**
 * Shikoyatni yopish.
 *
 * `OPEN` ATAYLAB yo'q: yopilgan shikoyatni qayta ochish moderator
 * qarorini yashirincha bekor qilish yo'li bo'lardi. Kerak bo'lsa yangi
 * shikoyat yoziladi va uning o'z izi qoladi.
 */
export const resolveReportSchema = z.object({
  status: z.enum(['REVIEWED', 'DISMISSED']),
});

export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
