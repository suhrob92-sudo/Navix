import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { likePost, unlikePost } from '@/modules/feed/feed.service';
import type { LikeResponse } from '@/modules/feed/feed.types';

/**
 * POST   /api/v1/posts/[id]/like — yoqtirish.
 * DELETE /api/v1/posts/[id]/like — yoqtirishni olib tashlash.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const result = await likePost(id, auth.userId);

  return apiSuccess<LikeResponse>(result, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const result = await unlikePost(id, auth.userId);

  return apiSuccess<LikeResponse>(result, { requestId });
});
