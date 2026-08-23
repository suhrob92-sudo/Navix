import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listFavorites } from '@/modules/favorite/favorite.service';
import type { FavoritesResponse } from '@/modules/favorite/favorite.types';

/**
 * GET /api/v1/favorites — to'liq ro'yxat, turlar bo'yicha guruhlangan.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const result = await listFavorites(auth.userId);

  return apiSuccess<FavoritesResponse>(result, { requestId });
});
