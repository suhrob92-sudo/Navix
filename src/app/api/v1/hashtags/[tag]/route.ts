import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { hashtagQuerySchema } from '@/modules/feed/feed.schemas';
import { listPostsByHashtag } from '@/modules/feed/feed.service';

/**
 * GET /api/v1/hashtags/[tag] — shu mavzudagi postlar.
 *
 * Mavzu manzildan keladi, ya'ni unga har narsa yozilishi mumkin.
 * Xizmat uni bazaga so'rov yuborishdan OLDIN tekshiradi.
 */
export const dynamic = 'force-dynamic';

type Params = { tag: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { tag } = await params;
  const query = parseSearchParams(request, hashtagQuerySchema);

  const result = await listPostsByHashtag(decodeURIComponent(tag), auth.userId, query.cursor, query.limit);

  return apiSuccess(result, { requestId, headers: { 'cache-control': 'no-store' } });
});
