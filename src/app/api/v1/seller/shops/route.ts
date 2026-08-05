import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { getSellerOverview } from '@/modules/seller/seller.service';

/**
 * GET /api/v1/seller/shops — mening do'konlarim va ko'rsatkichlar.
 *
 * Ro'yxat tokendagi foydalanuvchiga tayanadi: mijoz hech qanday ID
 * yubormaydi, shuning uchun begona do'konni so'rashning iloji yo'q.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.SELLER_DASHBOARD_ACCESS);

  const overview = await getSellerOverview(auth.userId);

  return apiSuccess(overview, { requestId, headers: { 'cache-control': 'no-store' } });
});
