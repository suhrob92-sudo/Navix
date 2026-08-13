import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { adminContentQuerySchema } from '@/modules/admin/admin.schemas';
import { listAdminContent } from '@/modules/admin/content.service';

/**
 * GET /api/v1/admin/content — mahsulot, taom, post va vakansiyalar.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_CONTENT_MANAGE);

  const query = parseSearchParams(request, adminContentQuerySchema);
  const items = await listAdminContent(query);

  return apiSuccess({ items }, { requestId, headers: { 'cache-control': 'no-store' } });
});
