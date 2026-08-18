import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { savedQuerySchema } from '@/modules/feed/collection.schemas';
import { listSavedPosts } from '@/modules/feed/feed.service';

/**
 * GET /api/v1/feed/saved — saqlangan postlar.
 *
 * Ro'yxat SAQLASH vaqti bo'yicha tartiblanadi: bir yillik postni
 * bugun saqlagan odam uni ro'yxat boshida ko'rishi kerak.
 *
 * `collection` parametri to'plam bo'yicha filtrlaydi: `ALL`,
 * `NONE` (guruhlanmagan) yoki to'plam ID si.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, savedQuerySchema);

  const result = await listSavedPosts(auth.userId, query.cursor, query.limit, query.collection);

  return apiSuccess(result, { requestId, headers: { 'cache-control': 'no-store' } });
});
