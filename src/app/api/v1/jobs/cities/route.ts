import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
import { apiSuccess } from '@/lib/api/response';
import { listVacancyCities } from '@/modules/job/job.service';

/**
 * GET /api/v1/jobs/cities — vakansiyalar bor shaharlar.
 *
 * Ro'yxat BAZADAN olinadi, qo'lda yozilmaydi: yangi shaharda e'lon
 * paydo bo'lsa, filtr o'zi yangilanadi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  /**
   * Ochiq manzil — chegara MANZIL bo'yicha.
   *
   * Sababi `lib/rate-limit.ts` dagi `publicCatalog` izohida: chegarasiz
   * ochiq katalogni skript bilan butunlay ko'chirib olish mumkin.
   */
  await enforcePublicRateLimit('publicCatalog', getRequestContext(request).ipAddress ?? 'anonim');

  const cities = await listVacancyCities();

  return apiSuccess({ cities }, { requestId });
});
