import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { getAdminStats } from '@/modules/admin/admin.service';

/**
 * GET /api/v1/admin/stats — platformaning umumiy ko'rsatkichlari.
 *
 * Faqat admin panelga kirish ruxsati borlar uchun.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_ADMIN_ACCESS);

  const stats = await getAdminStats();

  return apiSuccess(stats, { requestId, headers: { 'cache-control': 'no-store' } });
});
