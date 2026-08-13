import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { adminBusinessQuerySchema } from '@/modules/admin/admin.schemas';
import { listAdminBusinesses } from '@/modules/admin/business.service';

/**
 * GET /api/v1/admin/businesses — do'kon, restoran va mehmonxonalar.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_BUSINESS_MANAGE);

  const query = parseSearchParams(request, adminBusinessQuerySchema);
  const businesses = await listAdminBusinesses(query);

  return apiSuccess({ businesses }, { requestId, headers: { 'cache-control': 'no-store' } });
});
