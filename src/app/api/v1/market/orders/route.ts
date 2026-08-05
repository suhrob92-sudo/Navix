import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requireAuth, requirePermission } from '@/modules/auth/auth.guard';
import { createMarketOrderSchema, marketOrderQuerySchema } from '@/modules/market/market.schemas';
import { createMarketOrder, listMarketOrders } from '@/modules/market/market.service';

/**
 * GET  /api/v1/market/orders — mening buyurtmalarim
 * POST /api/v1/market/orders — buyurtma berish
 *
 * MUHIM: `POST` tanasida narx YO'Q. Faqat mahsulot ID'si va soni
 * yuboriladi, summa esa serverda bazadagi narxlardan hisoblanadi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, marketOrderQuerySchema);

  const { orders, total } = await listMarketOrders(auth.userId, query);

  return apiSuccess(
    { orders },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.ORDER_CREATE);
  const input = await parseJsonBody(request, createMarketOrderSchema);
  const context = getRequestContext(request);

  const order = await createMarketOrder(auth.userId, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ order }, { requestId, status: 201 });
});
