import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { sellerOrderQuerySchema } from '@/modules/seller/seller.schemas';
import { listSellerOrders } from '@/modules/seller/seller.service';

/**
 * GET /api/v1/seller/orders — do'konga kelgan buyurtmalar.
 *
 * Standart filtr — FAOL buyurtmalar, eng eskisi tepada: omborda
 * navbat tartibi buzilmasligi kerak.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.SELLER_DASHBOARD_ACCESS);
  const query = parseSearchParams(request, sellerOrderQuerySchema);

  const { orders, total } = await listSellerOrders(auth.userId, query);

  return apiSuccess(
    { orders },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
