import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { adminTicketQuerySchema } from '@/modules/support/support.schemas';
import { listAdminTickets } from '@/modules/support/support.service';

/** GET /api/v1/admin/support — barcha murojaatlar. */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_SUPPORT_MANAGE);

  const query = parseSearchParams(request, adminTicketQuerySchema);
  const { tickets, total, openCount } = await listAdminTickets(query);

  return apiSuccess(
    { tickets, openCount },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
