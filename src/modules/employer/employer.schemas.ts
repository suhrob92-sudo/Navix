import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';

/**
 * Ish beruvchi kabineti uchun validatsiya.
 *
 * ── Bosh qoida (sotuvchi kabinetidagi kabi) ───────────────────────────
 * Bu yerda KOMPANIYA EGASI so'rovdan kelmaydi. "Mening
 * vakansiyalarim" degan so'rov mijoz yuborgan ID'ga emas, tokendagi
 * foydalanuvchiga tayanadi.
 *
 * Kompaniya ID'si ba'zi joyda bor (qaysi kompaniyaga e'lon
 * qo'shilyapti), lekin u har doim EGALIK tekshiruvidan o'tadi.
 */

/**
 * Maosh chegaralari — SO'MDA (bazada tiyinga o'giriladi).
 *
 * Quyi chegara 500 000 so'm: undan kam raqam deyarli har doim xato
 * kiritish (masalan kunlik haqni oylik deb yozish).
 *
 * Yuqori chegara 500 mln so'm: undan kattasi ham xato — odatda
 * tiyinni so'm deb yozib yuborilgan bo'ladi.
 */
const MIN_SALARY_SOM = 500_000;
const MAX_SALARY_SOM = 500_000_000;

const salarySomSchema = z
  .number({ message: "Maoshni so'mda kiriting" })
  .int("Maosh butun so'mda bo'lishi kerak")
  .min(MIN_SALARY_SOM, `Eng kami ${MIN_SALARY_SOM} so'm`)
  .max(MAX_SALARY_SOM, 'Maosh juda katta — raqamni tekshiring');

/**
 * Maosh oralig'i tekshiruvi.
 *
 * `min > max` bo'lsa e'lon ma'nosini yo'qotadi va ro'yxatda ham
 * noto'g'ri saralanadi. Ikkalasi ham bo'sh qolishi mumkin — bu
 * "Kelishilgan" degani va u to'liq qonuniy holat.
 */
function checkSalaryRange(
  value: { salaryMinSom?: number; salaryMaxSom?: number },
  ctx: z.RefinementCtx,
): void {
  if (value.salaryMinSom === undefined || value.salaryMaxSom === undefined) return;

  if (value.salaryMinSom > value.salaryMaxSom) {
    ctx.addIssue({
      code: 'custom',
      path: ['salaryMaxSom'],
      message: 'Yuqori chegara quyisidan kam bo\'lmasligi kerak',
    });
  }
}

const titleSchema = z
  .string()
  .trim()
  .min(3, 'Lavozim nomi juda qisqa')
  .max(160, 'Lavozim nomi juda uzun');

/**
 * Tavsif MAJBURIY va eng kami 30 belgi.
 *
 * Bo'sh tavsifli e'lon nomzod uchun foydasiz: u nima ish qilishini
 * bilmasdan ariza yuboradi, keyin esa ikkala tomon ham vaqtini
 * behuda sarflaydi.
 */
const descriptionSchema = z
  .string()
  .trim()
  .min(30, "Ish haqida kamida 30 belgi yozing — nomzod nima qilishini bilishi kerak")
  .max(5_000, 'Tavsif juda uzun');

const citySchema = z.string().trim().min(2, 'Shaharni kiriting').max(80, 'Shahar nomi juda uzun');

const employmentTypeSchema = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE']);
const experienceLevelSchema = z.enum(['NONE', 'JUNIOR', 'MIDDLE', 'SENIOR']);

/** POST /api/v1/employer/vacancies */
export const createVacancySchema = z
  .object({
    companyId: z.uuid({ message: "Kompaniya noto'g'ri tanlangan" }),
    categoryId: z.uuid({ message: "Yo'nalish tanlanmagan" }),
    title: titleSchema,
    description: descriptionSchema,
    city: citySchema,
    employmentType: employmentTypeSchema.default('FULL_TIME'),
    experienceLevel: experienceLevelSchema.default('NONE'),
    salaryMinSom: salarySomSchema.optional(),
    salaryMaxSom: salarySomSchema.optional(),
  })
  .superRefine(checkSalaryRange);

export type CreateVacancyInput = z.infer<typeof createVacancySchema>;

/**
 * PATCH /api/v1/employer/vacancies/{id}
 *
 * `companyId` bu yerda YO'Q: e'lonni boshqa kompaniyaga ko'chirish
 * mumkin emas. Aks holda uni begona kompaniyaga "sovg'a qilib"
 * yuborish yo'li ochilardi.
 */
export const updateVacancySchema = z
  .object({
    categoryId: z.uuid().optional(),
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    city: citySchema.optional(),
    employmentType: employmentTypeSchema.optional(),
    experienceLevel: experienceLevelSchema.optional(),
    /**
     * Maoshni "Kelishilgan" holatiga qaytarish uchun `null` yuboriladi.
     * `undefined` esa "tegilmasin" degani — ikkalasi boshqa-boshqa.
     */
    salaryMinSom: salarySomSchema.nullable().optional(),
    salaryMaxSom: salarySomSchema.nullable().optional(),
    /** E'lonni yopish yoki qayta ochish. */
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (typeof value.salaryMinSom === 'number' && typeof value.salaryMaxSom === 'number') {
      checkSalaryRange({ salaryMinSom: value.salaryMinSom, salaryMaxSom: value.salaryMaxSom }, ctx);
    }
  });

export type UpdateVacancyInput = z.infer<typeof updateVacancySchema>;

/** GET /api/v1/employer/vacancies */
export const employerVacancyQuerySchema = paginationQuerySchema.extend({
  companyId: z.uuid().optional(),
  status: z.enum(['ALL', 'ACTIVE', 'CLOSED']).default('ALL'),
});

export type EmployerVacancyQuery = z.infer<typeof employerVacancyQuerySchema>;

/** GET /api/v1/employer/applications */
export const employerApplicationQuerySchema = paginationQuerySchema.extend({
  vacancyId: z.uuid().optional(),
  companyId: z.uuid().optional(),
  status: z.enum(['PENDING', 'SENT', 'INVITED', 'REJECTED', 'ALL']).default('PENDING'),
});

export type EmployerApplicationQuery = z.infer<typeof employerApplicationQuerySchema>;

/**
 * PATCH /api/v1/employer/applications/{id}
 *
 * `WITHDRAWN` bu yerda YO'Q va bu ataylab: arizani faqat nomzodning
 * o'zi qaytarib oladi.
 */
export const decideApplicationSchema = z.object({
  status: z.enum(['VIEWED', 'INVITED', 'REJECTED'], { message: "Noto'g'ri holat" }),
  /**
   * Nomzodga ko'rinadigan izoh.
   *
   * Suhbatga taklifda odatda aynan shu yerda vaqt va manzil
   * yoziladi, shuning uchun u bildirishnoma matniga ham qo'shiladi.
   */
  note: z.string().trim().max(500, 'Izoh juda uzun').optional(),
});

export type DecideApplicationInput = z.infer<typeof decideApplicationSchema>;
