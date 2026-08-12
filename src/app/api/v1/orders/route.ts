import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { ordersQuerySchema } from '@/modules/orders/orders.schemas';
import { listOrders } from '@/modules/orders/orders.service';

/**
 * GET /api/v1/orders — barcha modullardagi buyurtmalar bitta ro'yxatda.
 *
 * Ovqat, Marketplace, mehmonxona, chiptalar va posilkalar — hammasi
 * vaqt bo'yicha saralangan holda.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, ordersQuerySchema);

  const result = await listOrders(auth.userId, query);

  return apiSuccess(result, { requestId, headers: { 'cache-control': 'no-store' } });
});
