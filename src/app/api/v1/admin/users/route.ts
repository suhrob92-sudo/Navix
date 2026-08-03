import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { adminUserQuerySchema } from '@/modules/admin/admin.schemas';
import { listAdminUsers } from '@/modules/admin/admin.service';

/**
 * GET /api/v1/admin/users — foydalanuvchilar ro'yxati.
 *
 * Namuna: /api/v1/admin/users?search=901234567&status=SUSPENDED
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_USER_READ);
  const query = parseSearchParams(request, adminUserQuerySchema);

  const { users, total } = await listAdminUsers(query);

  return apiSuccess(
    { users },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
