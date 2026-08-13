import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';
import { MAX_ACCOUNT_REGEX_LENGTH, validateAccountRegex } from '@/modules/admin/account-regex';

/**
 * Admin panel uchun validatsiya.
 *
 * MUHIM: bu sxemalar admin YOZADIGAN ma'lumot uchun. Admin ishonchli
 * odam bo'lsa ham, xato yozishi mumkin — masalan chegarani teskari
 * kiritishi yoki naqshni buzib yozishi. Bunday xato butun provayderni
 * ishdan chiqaradi, shuning uchun tekshiruv oddiy foydalanuvchinikidan
 * ham qattiqroq.
 */

const CATEGORIES = ['UTILITY', 'INTERNET', 'MOBILE', 'TV'] as const;

const COLORS = [
  'amber',
  'rose',
  'blue',
  'orange',
  'green',
  'pink',
  'teal',
  'violet',
  'sky',
  'indigo',
  'slate',
] as const;

/**
 * Provayder kodi — barqaror identifikator.
 *
 * Faqat kichik harf, raqam va chiziqcha: `hududgaz`, `hududiy-elektr`.
 * Bu kod `npm run db:seed` uchun kalit va `ProviderIcon` da ikonka
 * tanlashda ishlatiladi, shuning uchun shakli qat'iy.
 */
const providerCodeSchema = z
  .string()
  .trim()
  .min(3, 'Kod kamida 3 ta belgi')
  .max(50, 'Kod 50 ta belgidan uzun')
  .regex(/^[a-z0-9-]+$/, "Kodda faqat kichik harf, raqam va '-' bo'lishi mumkin");

/** Naqsh — xavfsizlik tekshiruvidan o'tishi shart. */
const accountRegexSchema = z
  .string()
  .trim()
  .max(MAX_ACCOUNT_REGEX_LENGTH, `Naqsh ${MAX_ACCOUNT_REGEX_LENGTH} belgidan uzun`)
  .superRefine((value, ctx) => {
    for (const message of validateAccountRegex(value)) {
      ctx.addIssue({ code: 'custom', message });
    }
  });

/** Summa SO'MDA — bazada tiyinga o'giriladi. */
const amountSomSchema = z
  .number({ message: 'Summani kiriting' })
  .int("Summa butun so'mda bo'lishi kerak")
  .min(100, "Eng kami 100 so'm")
  .max(1_000_000_000, "1 mlrd so'mdan oshmasligi kerak");

/** Provayder maydonlari — yaratishda ham, tahrirlashda ham bir xil. */
const providerFieldsSchema = z.object({
  name: z.string().trim().min(2, 'Nomi kamida 2 ta belgi').max(120, 'Nomi juda uzun'),
  category: z.enum(CATEGORIES, { message: "Toifa noto'g'ri" }),
  description: z.string().trim().max(255, 'Izoh juda uzun').nullable().default(null),
  accountLabel: z.string().trim().min(3, 'Maydon nomi kamida 3 ta belgi').max(60, 'Juda uzun'),
  accountHint: z.string().trim().min(3, 'Namuna kamida 3 ta belgi').max(60, 'Juda uzun'),
  accountRegex: accountRegexSchema,
  minAmountSom: amountSomSchema,
  maxAmountSom: amountSomSchema,
  color: z.enum(COLORS, { message: "Rang noto'g'ri" }),
  sortOrder: z.number().int().min(0).max(9_999).default(100),
  isActive: z.boolean().default(true),
});

/**
 * POST /api/v1/admin/providers
 *
 * Chegaralar solishtiriladi: eng kichik summa eng kattasidan katta
 * bo'lib qolsa, provayderga umuman to'lab bo'lmaydi.
 */
export const createProviderSchema = providerFieldsSchema
  .extend({ code: providerCodeSchema })
  .superRefine((value, ctx) => {
    if (value.minAmountSom > value.maxAmountSom) {
      ctx.addIssue({
        code: 'custom',
        path: ['minAmountSom'],
        message: 'Eng kichik summa eng kattasidan oshmasligi kerak',
      });
    }
  });

export type CreateProviderInput = z.infer<typeof createProviderSchema>;

/**
 * PATCH /api/v1/admin/providers/[id]
 *
 * `code` ataylab YO'Q: u seed uchun kalit va eski to'lovlar bilan
 * bog'langan. O'zgartirilsa `npm run db:seed` dublikat yaratardi.
 * Chegaralarni solishtirish esa xizmat qatlamida — u yerda eski
 * qiymatlar ham ma'lum.
 */
export const updateProviderSchema = providerFieldsSchema.partial();

export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;

/** GET /api/v1/admin/providers */
export const adminProviderQuerySchema = z.object({
  category: z.enum(['ALL', ...CATEGORIES]).default('ALL'),
  /** Admin uchun o'chirilgan provayderlar ham ko'rinadi. */
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE']).default('ALL'),
  search: z.string().trim().min(1).max(120).optional(),
});

export type AdminProviderQuery = z.infer<typeof adminProviderQuerySchema>;

/** GET /api/v1/admin/users */
export const adminUserQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ALL', 'PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']).default('ALL'),
});

export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;

/**
 * PATCH /api/v1/admin/users/[id]
 *
 * `PENDING_VERIFICATION` bu yerda yo'q: uni admin qo'lda qo'ya olmaydi,
 * u faqat ro'yxatdan o'tishda tizim tomonidan beriladi. Orqaga qaytarish
 * foydalanuvchini telefonini qayta tasdiqlashga majburlardi.
 */
export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED'], { message: "Holat noto'g'ri" }),
  /** Bloklash sababi — audit jurnaliga yoziladi. */
  reason: z.string().trim().min(3, 'Sababni yozing').max(255, 'Juda uzun').optional(),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

/**
 * PATCH /api/v1/admin/users/[id]/roles
 *
 * `CUSTOMER` ataylab yo'q: u har bir foydalanuvchida bo'lishi kerak
 * bo'lgan asosiy rol, uni qo'lda olib tashlash foydalanuvchini
 * o'z profiliga ham kira olmaydigan holga keltirardi.
 */
export const updateUserRoleSchema = z.object({
  role: z.enum(['DRIVER', 'COURIER', 'MERCHANT', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN'], {
    message: "Rol noto'g'ri",
  }),
  action: z.enum(['grant', 'revoke'], { message: "Amal noto'g'ri" }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

/**
 * PATCH /api/v1/admin/payments/[id]/refund
 *
 * Sabab MAJBURIY. Pulni qaytarish — qaytarib bo'lmaydigan moliyaviy
 * amal; nizo chiqqanda "nima uchun qaytarilgan?" degan savolga javob
 * bo'lishi shart.
 */
export const refundPaymentSchema = z.object({
  reason: z.string().trim().min(5, 'Sababni batafsilroq yozing (kamida 5 ta belgi)').max(255, 'Sabab juda uzun'),
});

export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;

/** GET /api/v1/admin/audit */
export const adminAuditQuerySchema = paginationQuerySchema.extend({
  group: z.enum(['ALL', 'MONEY', 'ADMIN', 'AUTH']).default('ALL'),
  /** Aniq bitta amal bo'yicha filtrlash. */
  action: z.string().trim().min(3).max(120).optional(),
});

export type AdminAuditQuery = z.infer<typeof adminAuditQuerySchema>;

/** GET /api/v1/admin/payments */
export const adminPaymentQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ALL', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).default('ALL'),
});

export type AdminPaymentQuery = z.infer<typeof adminPaymentQuerySchema>;

/** GET /api/v1/admin/transactions */
export const adminTransactionQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['ALL', 'TOP_UP', 'WITHDRAWAL', 'PAYMENT', 'REFUND', 'TRANSFER', 'BONUS']).default('ALL'),
  direction: z.enum(['ALL', 'IN', 'OUT']).default('ALL'),
  status: z.enum(['ALL', 'PENDING', 'COMPLETED', 'FAILED', 'REVERSED']).default('ALL'),
});

export type AdminTransactionQuery = z.infer<typeof adminTransactionQuerySchema>;

/**
 * PATCH /api/v1/admin/modules/[id]
 *
 * ── Nima uchun sabab YOPISHDA majburiy ────────────────────────────────
 * Sabab foydalanuvchiga ko'rsatiladi: u "Xizmat ishlamayapti" degan
 * quruq yozuv o'rniga "Bank tomonida texnik ishlar, soat 18:00 da
 * tiklanadi" ni o'qiydi va qo'llab-quvvatlashga qo'ng'iroq qilmaydi.
 *
 * Qayta OCHISHDA sabab kerak emas — ochilgan bo'lim hech qanday
 * tushuntirish talab qilmaydi.
 */
export const setModuleEnabledSchema = z
  .object({
    isEnabled: z.boolean(),
    reason: z.string().trim().min(5, 'Sababni batafsilroq yozing (kamida 5 ta belgi)').max(200).optional(),
  })
  .refine((value) => value.isEnabled || Boolean(value.reason), {
    message: "Bo'limni yopish sababini yozing — u foydalanuvchiga ko'rsatiladi",
    path: ['reason'],
  });

export type SetModuleEnabledInput = z.infer<typeof setModuleEnabledSchema>;

/** GET /api/v1/admin/businesses */
export const adminBusinessQuerySchema = z.object({
  kind: z.enum(['ALL', 'SHOP', 'RESTAURANT', 'HOTEL']).default('ALL'),
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE']).default('ALL'),
  search: z.string().trim().min(1).max(80).optional(),
});

export type AdminBusinessQuery = z.infer<typeof adminBusinessQuerySchema>;

/**
 * PATCH /api/v1/admin/businesses/[kind]/[id]
 *
 * Sabab yopishda majburiy: do'konni yopish uning daromadini
 * to'xtatadi. Bunday qaror jurnalda izohsiz turmasligi kerak.
 */
export const setBusinessActiveSchema = z
  .object({
    isActive: z.boolean(),
    reason: z.string().trim().min(5, 'Sababni batafsilroq yozing (kamida 5 ta belgi)').max(200).optional(),
  })
  .refine((value) => value.isActive || Boolean(value.reason), {
    message: 'Yopish sababini yozing — u jurnalga yoziladi',
    path: ['reason'],
  });

export type SetBusinessActiveInput = z.infer<typeof setBusinessActiveSchema>;

/** GET /api/v1/admin/content */
export const adminContentQuerySchema = z.object({
  kind: z.enum(['ALL', 'PRODUCT', 'DISH', 'POST', 'VACANCY']).default('ALL'),
  status: z.enum(['ALL', 'VISIBLE', 'HIDDEN']).default('ALL'),
  search: z.string().trim().min(1).max(80).optional(),
});

export type AdminContentQuery = z.infer<typeof adminContentQuerySchema>;

/**
 * PATCH /api/v1/admin/content/[kind]/[id]
 *
 * Sabab yashirishda majburiy: sotuvchi "mahsulotim nega yo'qoldi?"
 * deb so'raganda javob jurnalda bo'lishi kerak, xodimning
 * xotirasida emas.
 */
export const setContentVisibleSchema = z
  .object({
    isVisible: z.boolean(),
    reason: z.string().trim().min(5, 'Sababni batafsilroq yozing (kamida 5 ta belgi)').max(200).optional(),
  })
  .refine((value) => value.isVisible || Boolean(value.reason), {
    message: 'Yashirish sababini yozing — u jurnalga yoziladi',
    path: ['reason'],
  });

export type SetContentVisibleInput = z.infer<typeof setContentVisibleSchema>;

/** GET /api/v1/admin/waitlist */
export const adminWaitlistQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(80).optional(),
});

export type AdminWaitlistQuery = z.infer<typeof adminWaitlistQuerySchema>;
