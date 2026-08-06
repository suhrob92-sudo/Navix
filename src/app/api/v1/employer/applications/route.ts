import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { employerApplicationQuerySchema } from '@/modules/employer/employer.schemas';
import { listEmployerApplications } from '@/modules/employer/employer.service';

/**
 * GET /api/v1/employer/applications — kelgan arizalar.
 *
 * Javobda nomzodning TELEFON RAQAMI bor. Shuning uchun bu yerda
 * ikki qatlam himoya: ruxsat (`requirePermission`) va egalik
 * (`vacancy.company.ownerId = userId`, servis ichida).
 *
 * `no-store` — javob hech qayerda keshlanmasin.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.EMPLOYER_DASHBOARD_ACCESS);
  const query = parseSearchParams(request, employerApplicationQuerySchema);

  const { applications, total } = await listEmployerApplications(auth.userId, query);

  return apiSuccess(
    { applications },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
