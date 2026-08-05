import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { cancelMarketOrderSchema } from '@/modules/market/market.schemas';
import { cancelMarketOrder } from '@/modules/market/market.service';

/**
 * POST /api/v1/market/orders/[id]/cancel — buyurtmani bekor qilish.
 *
 * Pul to'liq qaytariladi VA zaxira tiklanadi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid({ message: "Buyurtma noto'g'ri" }) });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, cancelMarketOrderSchema);
  const context = getRequestContext(request);

  const order = await cancelMarketOrder(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ order }, { requestId });
});
