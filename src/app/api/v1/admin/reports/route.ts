import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { adminReportQuerySchema } from '@/modules/moderation/moderation.schemas';
import { listAdminReports } from '@/modules/moderation/moderation.service';

/**
 * GET /api/v1/admin/reports — foydalanuvchilar shikoyatlari.
 *
 * Namuna: /api/v1/admin/reports?status=OPEN
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_REPORT_MANAGE);
  const query = parseSearchParams(request, adminReportQuerySchema);

  const { reports, total } = await listAdminReports(query);

  return apiSuccess(
    { reports },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
