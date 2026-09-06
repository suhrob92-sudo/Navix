import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { rateRideSchema } from '@/modules/taxi/taxi.schemas';
import { rateRide } from '@/modules/taxi/taxi.service';

/**
 * POST /api/v1/taxi/rides/[id]/rate — haydovchini baholash.
 *
 * Baho bir marta qo'yiladi va o'zgartirilmaydi — sabab
 * `taxi.service.ts` da yozilgan.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Safar ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, rateRideSchema);

  const ride = await rateRide(auth.userId, id, input);

  return apiSuccess({ ride }, { requestId });
});
