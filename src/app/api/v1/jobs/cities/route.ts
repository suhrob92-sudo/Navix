import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { listVacancyCities } from '@/modules/job/job.service';

/**
 * GET /api/v1/jobs/cities — vakansiyalar bor shaharlar.
 *
 * Ro'yxat BAZADAN olinadi, qo'lda yozilmaydi: yangi shaharda e'lon
 * paydo bo'lsa, filtr o'zi yangilanadi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (_request: NextRequest, { requestId }) => {
  const cities = await listVacancyCities();

  return apiSuccess({ cities }, { requestId });
});
