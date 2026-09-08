import { z } from 'zod';

import { isValidMonth } from '@/modules/finance/finance.calc';

/**
 * Moliya markazi so'rovlari uchun validatsiya.
 *
 * ── Nima uchun oy MATN, sana emas ─────────────────────────────────────
 * Hisobot butun oy bo'yicha. Sana berilsa, "qaysi kundan qaysi
 * kungacha" degan savol paydo bo'lardi va ikki xil so'rov bir xil
 * oyni turlicha ko'rsatishi mumkin edi.
 *
 * `YYYY-MM` esa bir qiymatli: bitta oy — bitta hisobot.
 */
export const financeQuerySchema = z.object({
  /**
   * Qaysi oy. Berilmasa — joriy oy.
   *
   * Chegarani `isValidMonth` tekshiradi: u `2026-13` kabi mavjud
   * bo'lmagan oyni rad etadi. Faqat naqsh tekshirilsa, bunday
   * qiymat o'tib ketib, bazada bo'sh natija berardi.
   */
  month: z
    .string()
    .refine(isValidMonth, "Oy noto'g'ri — `2026-09` ko'rinishida bo'lishi kerak")
    .optional(),
});

export type FinanceQuery = z.infer<typeof financeQuerySchema>;
