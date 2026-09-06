import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth, requirePermission } from '@/modules/auth/auth.guard';
import { createRideSchema, rideQuerySchema } from '@/modules/taxi/taxi.schemas';
import { createRide, listRides } from '@/modules/taxi/taxi.service';

/**
 * GET  /api/v1/taxi/rides — mening safarlarim.
 * POST /api/v1/taxi/rides — taksi chaqirish (pul darhol yechiladi).
 *
 * Narx so'rovda YO'Q: u serverda tarif va masofa bo'yicha qayta
 * hisoblanadi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, rideQuerySchema);

  const { rides, total } = await listRides(auth.userId, query);

  return apiSuccess(
    { rides },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.TAXI_RIDE_CREATE);
  const input = await parseJsonBody(request, createRideSchema);
  const context = getRequestContext(request);

  const ride = await createRide(auth.userId, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ ride }, { requestId, status: 201 });
});
