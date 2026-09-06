import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { getRequestContext } from '@/lib/request-context';
import { requirePermission } from '@/modules/auth/auth.guard';
import { acceptRide } from '@/modules/taxi/taxi.service';

/**
 * POST /api/v1/taxi/driver/rides/[id]/accept — buyurtmani o'ziga olish.
 *
 * Ikki haydovchi bir vaqtda bossa, ikkinchisi 409 oladi: shart
 * so'rovning ichida tekshiriladi (`taxi.service.ts`).
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Safar ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.TAXI_RIDE_ACCEPT);
  const { id } = paramsSchema.parse(await params);
  const context = getRequestContext(request);

  const ride = await acceptRide(auth.userId, id, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ ride }, { requestId });
});
