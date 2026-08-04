import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { merchantOrderQuerySchema } from '@/modules/merchant/merchant.schemas';
import { listMerchantOrders } from '@/modules/merchant/merchant.service';

/**
 * GET /api/v1/merchant/orders — restoranga kelgan buyurtmalar.
 *
 * Standart filtr — FAOL buyurtmalar, eng eskisi tepada: oshxonada
 * navbat tartibi buzilmasligi kerak.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.ORDER_MANAGE);
  const query = parseSearchParams(request, merchantOrderQuerySchema);

  const { orders, total } = await listMerchantOrders(auth.userId, query);

  return apiSuccess(
    { orders },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
