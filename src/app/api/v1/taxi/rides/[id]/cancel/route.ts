import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { getRequestContext } from '@/lib/request-context';
import { requirePermission } from '@/modules/auth/auth.guard';
import { cancelRideSchema } from '@/modules/taxi/taxi.schemas';
import { cancelRide } from '@/modules/taxi/taxi.service';

/**
 * POST /api/v1/taxi/rides/[id]/cancel — bekor qilish va pulni qaytarish.
 *
 * `DELETE` emas: safar yozuvi va pul harakati tarixda qoladi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Safar ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.TAXI_RIDE_CANCEL);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, cancelRideSchema);
  const context = getRequestContext(request);

  const ride = await cancelRide(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ ride }, { requestId });
});
