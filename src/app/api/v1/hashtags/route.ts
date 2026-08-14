import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listTrendingHashtags } from '@/modules/feed/feed.service';
import type { HashtagListResponse } from '@/modules/feed/feed.types';

/**
 * GET /api/v1/hashtags — mashhur mavzular.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requireAuth(request);

  const hashtags = await listTrendingHashtags();

  return apiSuccess<HashtagListResponse>({ hashtags }, { requestId });
});
