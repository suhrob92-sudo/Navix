import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getMarketOrder } from '@/modules/market/market.service';

/** GET /api/v1/market/orders/[id] — bitta buyurtma. */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid({ message: "Buyurtma noto'g'ri" }) });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const order = await getMarketOrder(auth.userId, id);

  return apiSuccess({ order }, { requestId, headers: { 'cache-control': 'no-store' } });
});
