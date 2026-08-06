import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';

/**
 * Ish qidirish uchun validatsiya.
 *
 * ── Bosh qoida ────────────────────────────────────────────────────────
 * Ariza yuborishda mijozdan FAQAT qisqa xat keladi. Kim yuborayotgani
 * tokendan olinadi, telefon raqami esa profildan — so'rovdan emas.
 *
 * Aks holda begona odam nomidan ariza yuborish yoki boshqa odamning
 * raqamini yozib qo'yish mumkin bo'lardi.
 */

/**
 * GET /api/v1/jobs/vacancies
 *
 * Maosh chegarasi SO'MDA keladi — manzil satrida tiyin yozish
 * foydalanuvchi uchun tushunarsiz bo'lardi.
 */
export const vacancyQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  company: z.string().trim().min(1).max(60).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE']).optional(),
  experienceLevel: z.enum(['NONE', 'JUNIOR', 'MIDDLE', 'SENIOR']).optional(),
  /** Shundan kam maoshli e'lonlar ko'rsatilmaydi. */
  minSalarySom: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  sort: z.enum(['new', 'salary']).default('new'),
});

export type VacancyQuery = z.infer<typeof vacancyQuerySchema>;

/**
 * POST /api/v1/jobs/applications
 *
 * `contactPhone` bu yerda YO'Q: u profildan olinadi. Mijozdan kelsa,
 * nomzod boshqa odamning raqamini yozib, uni keraksiz qo'ng'iroqqa
 * ko'mib tashlashi mumkin bo'lardi.
 */
export const createApplicationSchema = z.object({
  vacancyId: z.uuid({ message: "Vakansiya noto'g'ri tanlangan" }),
  /**
   * Qisqa xat — ixtiyoriy.
   *
   * Majburiy qilinmadi: ko'p nomzod telefondan ariza yuboradi va uzun
   * matn yozish to'siq bo'ladi. Bo'sh xat ham arizani bekor qilmaydi.
   */
  coverNote: z.string().trim().max(1_000, 'Xat juda uzun').optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

/** GET /api/v1/jobs/applications */
export const applicationQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ALL', 'ACTIVE', 'INVITED', 'REJECTED']).default('ALL'),
});

export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;
