import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { isKnownViolation } from '@/config/csp';
import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
import { recordError } from '@/modules/error-log/error-log.service';

/**
 * POST /api/v1/csp-report — brauzer yuborgan CSP buzilishi haqidagi xabar.
 *
 * ── Nima uchun ALOHIDA manzil ─────────────────────────────────────────
 * Brauzer bu xabarni O'ZI yuboradi va tanasining shakli qat'iy
 * belgilangan (`{"csp-report": {...}}`). U bizning oddiy xato
 * hisobotimizga o'xshamaydi, shuning uchun uni alohida o'qib,
 * keyin umumiy jurnalga yozamiz.
 *
 * ── Nima uchun KIRISH talab qilinmaydi ────────────────────────────────
 * Xabarni brauzer yuboradi, foydalanuvchi emas. Unda token yo'q va
 * hech qachon bo'lmaydi.
 *
 * ── Ochiq manzil qanday himoyalangan ──────────────────────────────────
 *  1. Chastota cheklovi IP bo'yicha;
 *  2. Tana shakli tekshiriladi, uzunliklar kesiladi;
 *  3. Bir xil buzilishlar jurnalda BITTA qatorga yig'iladi — ya'ni
 *     jadvalni to'ldirib yuborish mumkin emas;
 *  4. Javob har doim bir xil — soxta xabar yuborgan odam hech qanday
 *     ma'lumot ololmaydi.
 */
export const dynamic = 'force-dynamic';

/**
 * Brauzer yuboradigan tana.
 *
 * Maydonlar `passthrough` bilan qabul qilinadi: brauzerlar bir-biridan
 * biroz farq qiladi va noma'lum maydon butun xabarni rad etishga sabab
 * bo'lmasligi kerak.
 */
const cspReportSchema = z.object({
  'csp-report': z
    .object({
      'document-uri': z.string().max(500).optional(),
      'violated-directive': z.string().max(200).optional(),
      'effective-directive': z.string().max(200).optional(),
      'blocked-uri': z.string().max(500).optional(),
      'source-file': z.string().max(500).optional(),
      'line-number': z.number().optional(),
    })
    .loose(),
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const context = getRequestContext(request);

  await enforcePublicRateLimit('cspReport', context.ipAddress ?? 'anonim', "Juda ko'p so'rov.");

  /**
   * Tana QO'LDA o'qiladi.
   *
   * Brauzer `content-type: application/csp-report` yuboradi, bizning
   * umumiy o'quvchimiz esa `application/json` kutadi va bunday
   * xabarni rad etardi.
   */
  const parsed = cspReportSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    /**
     * Noto'g'ri tana XATO emas.
     *
     * Bu manzilga har xil brauzer har xil shaklda yuborishi mumkin.
     * "422" qaytarish brauzerni qayta urinishga majburlardi va foyda
     * bermasdi — biz shunchaki e'tiborsiz qoldiramiz.
     */
    return apiSuccess({ received: true }, { requestId, status: 202 });
  }

  const report = parsed.data['csp-report'];
  const directive = report['effective-directive'] ?? report['violated-directive'] ?? "noma'lum";
  const blocked = report['blocked-uri'] ?? "noma'lum";

  /**
   * ALLAQACHON O'LCHANGAN buzilish — jimgina tashlab yuboriladi.
   *
   * Sababi `config/csp.ts` dagi `KNOWN_VIOLATIONS` izohida: ular har
   * bir sahifa ochilishida keladi va yangi hech narsa aytmaydi.
   * Ularni yozish jurnalni ko'mib tashlardi va haqiqiy, yangi
   * buzilishni ko'rinmas qilib qo'yardi.
   */
  if (isKnownViolation(directive, blocked)) {
    return apiSuccess({ received: true }, { requestId, status: 202 });
  }

  logger.warn({ directive, blocked, source: report['source-file'] }, 'CSP qoidasi buzildi');

  await recordError({
    source: 'BROWSER',
    /**
     * Turi ALOHIDA: admin panelda ularni oddiy xatolardan ajratib
     * ko'rish kerak. Bular hali xato emas — bular "yangi qoida
     * nimani to'sib qo'yishi mumkin" degan ogohlantirish.
     */
    kind: 'CSP',
    message: `${directive} — ${blocked}`,
    path: report['document-uri'] ?? '/',
    stack: report['source-file'] ? `${report['source-file']}:${report['line-number'] ?? 0}` : null,
  });

  return apiSuccess({ received: true }, { requestId, status: 202 });
});
