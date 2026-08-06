import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { createVacancySchema, employerVacancyQuerySchema } from '@/modules/employer/employer.schemas';
import { createVacancy, listEmployerVacancies } from '@/modules/employer/employer.service';

/**
 * GET  /api/v1/employer/vacancies — mening e'lonlarim.
 * POST /api/v1/employer/vacancies — yangi e'lon.
 *
 * E'lon joylash uchun ALOHIDA ruxsat kerak: kelajakda kompaniyada
 * arizalarni ko'radigan-yu e'lon joylay olmaydigan xodim bo'lishi
 * mumkin.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.EMPLOYER_DASHBOARD_ACCESS);
  const query = parseSearchParams(request, employerVacancyQuerySchema);

  const { vacancies, total, categories } = await listEmployerVacancies(auth.userId, query);

  return apiSuccess(
    { vacancies, categories },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.EMPLOYER_VACANCY_MANAGE);
  const input = await parseJsonBody(request, createVacancySchema);
  const context = getRequestContext(request);

  const vacancy = await createVacancy(auth.userId, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ vacancy }, { requestId, status: 201 });
});
