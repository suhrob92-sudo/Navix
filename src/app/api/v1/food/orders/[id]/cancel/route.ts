import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { cancelFoodOrderSchema } from '@/modules/food/food.schemas';
import { cancelFoodOrder } from '@/modules/food/food.service';

/**
 * POST /api/v1/food/orders/[id]/cancel — buyurtmani bekor qilish.
 *
 * Pul to'liq qaytariladi. Faqat oshxona tayyorlashni boshlamagan
 * bo'lsa ishlaydi.
 *
 * Nima uchun POST: bu resursni tahrirlash emas, yangi moliyaviy amal —
 * hamyonda qaytarish tranzaksiyasi paydo bo'ladi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Buyurtma ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, cancelFoodOrderSchema);
  const context = getRequestContext(request);

  const order = await cancelFoodOrder(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ order }, { requestId });
});
