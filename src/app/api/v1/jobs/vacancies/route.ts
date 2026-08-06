import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { optionalAuth } from '@/modules/auth/auth.guard';
import { vacancyQuerySchema } from '@/modules/job/job.schemas';
import { listVacancies } from '@/modules/job/job.service';

/**
 * GET /api/v1/jobs/vacancies — vakansiyalar ro'yxati.
 *
 * ── Nima uchun `optionalAuth` ────────────────────────────────────────
 * E'lonlarni ko'rish uchun kirish shart emas: odam avval nima borligini
 * ko'radi, keyin ro'yxatdan o'tadi. Majburiy kirish bu yerda faqat
 * to'siq bo'lardi.
 *
 * Kirgan bo'lsa — qaysi e'longa ariza yuborgani belgilanadi
 * (`hasApplied`). Kirmagan bo'lsa u har doim `false`.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await optionalAuth(request);
  const query = parseSearchParams(request, vacancyQuerySchema);

  const { vacancies, total } = await listVacancies(query, auth?.userId ?? null);

  return apiSuccess(
    { vacancies, total },
    { requestId, pagination: buildPagination(query.page, query.pageSize, total) },
  );
});
