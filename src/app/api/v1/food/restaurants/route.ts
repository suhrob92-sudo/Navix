import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { restaurantQuerySchema } from '@/modules/food/food.schemas';
import { listRestaurants } from '@/modules/food/food.service';

/**
 * GET /api/v1/food/restaurants — restoranlar ro'yxati.
 *
 * Namuna: /api/v1/food/restaurants?cuisine=Milliy&search=lag'mon
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requireAuth(request);
  const query = parseSearchParams(request, restaurantQuerySchema);

  const restaurants = await listRestaurants(query);

  return apiSuccess({ restaurants }, { requestId });
});
