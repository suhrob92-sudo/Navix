import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getProvider } from '@/modules/payment/payment.service';

/**
 * GET /api/v1/payments/providers/[id] — bitta xizmat haqida ma'lumot.
 *
 * To'lov formasi shu yerdan hisob raqami maydonining nomini, namunani
 * va summa chegaralarini oladi — ular har provayderda har xil.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.string().uuid("Xizmat ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const provider = await getProvider(id);

  return apiSuccess(provider, { requestId });
});
