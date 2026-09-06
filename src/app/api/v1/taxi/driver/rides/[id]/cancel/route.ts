import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { getRequestContext } from '@/lib/request-context';
import { requirePermission } from '@/modules/auth/auth.guard';
import { cancelRideSchema } from '@/modules/taxi/taxi.schemas';
import { driverCancelRide } from '@/modules/taxi/taxi.service';

/**
 * POST /api/v1/taxi/driver/rides/[id]/cancel — haydovchi voz kechadi.
 *
 * Mijozga pul QAYTARILADI va u xabar oladi. Safar qayta taklif
 * qilinmaydi — sabab `taxi.service.ts` da yozilgan.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Safar ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.TAXI_RIDE_ACCEPT);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, cancelRideSchema);
  const context = getRequestContext(request);

  const ride = await driverCancelRide(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ ride }, { requestId });
});
