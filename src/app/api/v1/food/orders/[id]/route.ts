import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getFoodOrder } from '@/modules/food/food.service';

/**
 * GET /api/v1/food/orders/[id] — bitta buyurtma.
 *
 * Boshqa foydalanuvchining buyurtmasi so'ralsa "topilmadi" qaytadi —
 * uning mavjudligi ham oshkor qilinmaydi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Buyurtma ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const order = await getFoodOrder(auth.userId, id);

  return apiSuccess({ order }, { requestId, headers: { 'cache-control': 'no-store' } });
});
