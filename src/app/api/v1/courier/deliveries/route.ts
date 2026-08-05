import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { deliveryQuerySchema } from '@/modules/courier/courier.schemas';
import { listDeliveries } from '@/modules/courier/courier.service';

/**
 * GET /api/v1/courier/deliveries — topshiriqlar.
 *
 * `status=AVAILABLE` — umumiy ro'yxat (egasiz topshiriqlar, eng
 * eskisi tepada). Qolgan filtrlarda faqat kuryerning O'ZINIKI.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.COURIER_DASHBOARD_ACCESS);
  const query = parseSearchParams(request, deliveryQuerySchema);

  const { deliveries, total } = await listDeliveries(auth.userId, query);

  return apiSuccess(
    { deliveries },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
