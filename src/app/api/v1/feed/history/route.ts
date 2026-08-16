import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { hashtagQuerySchema } from '@/modules/feed/feed.schemas';
import { listSeenPosts } from '@/modules/feed/feed.service';

/**
 * GET /api/v1/feed/history — oxirgi ko'rganlarim.
 *
 * Faqat O'ZIMNIKI: boshqa odam nimani ko'rgani shaxsiy ma'lumot va
 * uni ochib bo'lmaydi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, hashtagQuerySchema);

  const result = await listSeenPosts(auth.userId, query.cursor, query.limit);

  return apiSuccess(result, { requestId, headers: { 'cache-control': 'no-store' } });
});
