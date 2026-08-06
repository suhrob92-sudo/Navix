import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { applicationQuerySchema, createApplicationSchema } from '@/modules/job/job.schemas';
import { createApplication, listApplications } from '@/modules/job/job.service';

/**
 * GET  /api/v1/jobs/applications — mening arizalarim
 * POST /api/v1/jobs/applications — ariza yuborish
 *
 * Bu yerda kirish MAJBURIY: ariza bilan birga nomzodning telefon
 * raqami ish beruvchiga ochiladi, shuning uchun kim yuborayotgani
 * aniq bo'lishi shart.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, applicationQuerySchema);

  const { applications, total } = await listApplications(auth.userId, query);

  return apiSuccess(
    { applications },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createApplicationSchema);

  const application = await createApplication(auth.userId, input);

  return apiSuccess({ application }, { requestId, status: 201 });
});
