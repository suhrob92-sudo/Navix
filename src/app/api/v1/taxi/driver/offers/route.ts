import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { rideOffersSchema } from '@/modules/taxi/taxi.schemas';
import { listRideOffers } from '@/modules/taxi/taxi.service';

/**
 * GET /api/v1/taxi/driver/offers — yaqin atrofdagi ochiq buyurtmalar.
 *
 * Ruxsat TALAB qilinadi: bu ro'yxatda mijozlarning manzillari bor va
 * uni faqat haydovchi ko'rishi kerak.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.TAXI_RIDE_ACCEPT);
  const input = parseSearchParams(request, rideOffersSchema);

  const offers = await listRideOffers(auth.userId, input);

  return apiSuccess({ offers }, { requestId, headers: { 'cache-control': 'no-store' } });
});
