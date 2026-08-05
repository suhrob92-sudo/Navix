import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { getCourierOverview } from '@/modules/courier/courier.service';

/**
 * GET /api/v1/courier/overview — kuryerning kuni.
 *
 * Bitta so'rovda uchta savolga javob: hozir nima qilishim kerak,
 * bugun qancha ishladim, ro'yxatda ish bormi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.COURIER_DASHBOARD_ACCESS);

  const overview = await getCourierOverview(auth.userId);

  return apiSuccess(overview, { requestId, headers: { 'cache-control': 'no-store' } });
});
