import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { getMerchantOverview } from '@/modules/merchant/merchant.service';

/**
 * GET /api/v1/merchant/restaurants — mening restoranlarim va ko'rsatkichlar.
 *
 * Ro'yxat tokendagi foydalanuvchiga tayanadi: mijoz hech qanday ID
 * yubormaydi, shuning uchun begona restoranni so'rashning iloji yo'q.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.MERCHANT_DASHBOARD_ACCESS);

  const overview = await getMerchantOverview(auth.userId);

  return apiSuccess(overview, { requestId, headers: { 'cache-control': 'no-store' } });
});
