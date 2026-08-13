import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';

/**
 * Yordam xizmati uchun so'rov sxemalari.
 *
 * ── Nima uchun matn uzunligi PASTDAN ham cheklangan ───────────────────
 * "Ishlamayapti" degan bir so'zli murojaatga javob berib bo'lmaydi:
 * xodim baribir "nima ishlamayapti?" deb qayta so'raydi va bu ikki
 * marta ko'proq vaqt oladi.
 *
 * Pastki chegara odamni bir-ikki jumla yozishga undaydi — bu esa
 * ko'pincha birinchi javobdayoq masalani hal qiladi.
 */

const SUBJECT_MIN = 5;
const SUBJECT_MAX = 120;
const BODY_MIN = 10;
const BODY_MAX = 2_000;

export const createTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(SUBJECT_MIN, `Mavzuni kamida ${SUBJECT_MIN} ta belgi bilan yozing`)
    .max(SUBJECT_MAX, 'Mavzu juda uzun — qisqartiring'),
  category: z.enum(['ORDER', 'PAYMENT', 'ACCOUNT', 'BUG', 'OTHER'], {
    message: 'Mavzu turini tanlang',
  }),
  message: z
    .string()
    .trim()
    .min(BODY_MIN, `Muammoni batafsilroq yozing (kamida ${BODY_MIN} ta belgi)`)
    .max(BODY_MAX, 'Xabar juda uzun — qisqartiring'),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const replyTicketSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Xabar bo'sh")
    .max(BODY_MAX, 'Xabar juda uzun — qisqartiring'),
});

export type ReplyTicketInput = z.infer<typeof replyTicketSchema>;

/** GET /api/v1/support */
export const ticketQuerySchema = z.object({
  status: z.enum(['ALL', 'ACTIVE', 'FINISHED']).default('ALL'),
});

export type TicketQuery = z.infer<typeof ticketQuerySchema>;

/** GET /api/v1/admin/support */
export const adminTicketQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ALL', 'OPEN', 'ANSWERED', 'RESOLVED', 'CLOSED']).default('ALL'),
  category: z.enum(['ALL', 'ORDER', 'PAYMENT', 'ACCOUNT', 'BUG', 'OTHER']).default('ALL'),
  search: z.string().trim().min(1).max(80).optional(),
});

export type AdminTicketQuery = z.infer<typeof adminTicketQuerySchema>;

/**
 * PATCH /api/v1/admin/support/[id]
 *
 * Xodim murojaat holatini o'zgartiradi. Faqat YAKUNIY holatlar:
 * `OPEN` va `ANSWERED` qo'lda qo'yilmaydi — ular xabar yozilganda
 * o'zi qo'yiladi va shuning uchun har doim haqiqatga mos bo'ladi.
 */
export const updateTicketStatusSchema = z.object({
  status: z.enum(['RESOLVED', 'CLOSED'], { message: 'Holat notanish' }),
});

export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
