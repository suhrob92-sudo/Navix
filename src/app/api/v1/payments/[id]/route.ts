import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getPayment } from '@/modules/payment/payment.service';

/**
 * GET /api/v1/payments/[id] — bitta to'lov (chek).
 *
 * Boshqa foydalanuvchining to'lovi so'ralsa "topilmadi" qaytadi —
 * mavjudligi ham oshkor qilinmaydi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.string().uuid("To'lov ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const payment = await getPayment(auth.userId, id);

  return apiSuccess(payment, { requestId, headers: { 'cache-control': 'no-store' } });
});
