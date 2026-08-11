import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
import { clientErrorSchema } from '@/modules/error-log/error-log.schemas';
import { recordError } from '@/modules/error-log/error-log.service';

/**
 * POST /api/v1/client-errors — brauzerdagi xatoni qabul qiladi.
 *
 * ── Nima uchun KIRISH talab qilinmaydi ────────────────────────────────
 * Xatolarning katta qismi odam tizimga kirgunga qadar yuz beradi:
 * kirish sahifasi ochilmadi, forma ishlamadi, ekran oq bo'lib qoldi.
 * Token talab qilinsa, aynan eng muhim xatolar yig'ilmasdi.
 *
 * ── Ochiq manzil qanday himoyalangan ──────────────────────────────────
 *  1. Chastota cheklovi — IP bo'yicha (pastda);
 *  2. Har maydon uzunligi cheklangan (`clientErrorSchema`);
 *  3. Bir xil xatolar bazada BITTA qatorga yig'iladi — ya'ni jadvalni
 *     to'ldirib yuborish mumkin emas;
 *  4. Brauzer tomoni ham bir xil xatoni ikki marta yubormaydi.
 */
export const dynamic = 'force-dynamic';

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const context = getRequestContext(request);

  /**
   * Cheklov IP bo'yicha: bu yerda foydalanuvchi noma'lum.
   *
   * Chegara saxiy — bitta buzilgan sahifa bir necha xil xato
   * chiqarishi mumkin va ularning hammasi kerak.
   */
  await enforcePublicRateLimit('clientError', context.ipAddress ?? 'anonim', "Juda ko'p so'rov.");

  const input = await parseJsonBody(request, clientErrorSchema);

  await recordError({
    source: 'BROWSER',
    kind: input.kind,
    message: input.message,
    path: input.path,
    stack: input.stack ?? null,
  });

  /**
   * Javob BO'SH.
   *
   * Brauzer bu javobni o'qimaydi ham — hisobot yuborildi, ish tugadi.
   */
  return apiSuccess({ received: true }, { requestId, status: 202 });
});
