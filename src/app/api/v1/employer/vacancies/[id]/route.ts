import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { updateVacancySchema } from '@/modules/employer/employer.schemas';
import { getEmployerVacancy, updateVacancy } from '@/modules/employer/employer.service';

/**
 * GET   /api/v1/employer/vacancies/[id] — bitta e'lon.
 * PATCH /api/v1/employer/vacancies/[id] — tahrirlash yoki yopish.
 *
 * Kompaniya ID'si manzilda yo'q: egalik e'lonning O'ZIDAN
 * tekshiriladi (`vacancy.company.ownerId = userId`).
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Vakansiya ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.EMPLOYER_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);

  const vacancy = await getEmployerVacancy(auth.userId, id);

  return apiSuccess({ vacancy }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.EMPLOYER_VACANCY_MANAGE);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateVacancySchema);
  const context = getRequestContext(request);

  const vacancy = await updateVacancy(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ vacancy }, { requestId });
});
