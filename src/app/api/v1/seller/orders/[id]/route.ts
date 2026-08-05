import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { updateSellerOrderStatusSchema } from '@/modules/seller/seller.schemas';
import { getSellerOrder, updateSellerOrderStatus } from '@/modules/seller/seller.service';

/**
 * GET   /api/v1/seller/orders/[id] — bitta buyurtma
 * PATCH /api/v1/seller/orders/[id] — holatni o'zgartirish
 *
 * O'tish `MARKET_ORDER_TRANSITIONS` jadvali bo'yicha tekshiriladi:
 * bosqichni sakrab yoki orqaga qaytib bo'lmaydi. Rad etilganda pul
 * mijozga qaytadi va zaxira omborga tiklanadi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Buyurtma ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.SELLER_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);

  const order = await getSellerOrder(auth.userId, id);

  return apiSuccess({ order }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.SELLER_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateSellerOrderStatusSchema);
  const context = getRequestContext(request);

  const order = await updateSellerOrderStatus(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ order }, { requestId });
});
