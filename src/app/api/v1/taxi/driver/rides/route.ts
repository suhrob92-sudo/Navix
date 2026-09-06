import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { rideQuerySchema } from '@/modules/taxi/taxi.schemas';
import { listDriverRides } from '@/modules/taxi/taxi.service';

/** GET /api/v1/taxi/driver/rides — haydovchining safarlari. */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.TAXI_RIDE_ACCEPT);
  const query = parseSearchParams(request, rideQuerySchema);

  const { rides, total } = await listDriverRides(auth.userId, query);

  return apiSuccess(
    { rides },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
