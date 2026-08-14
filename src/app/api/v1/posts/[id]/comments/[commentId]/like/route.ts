import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { likeComment, unlikeComment } from '@/modules/feed/feed.service';
import type { LikeResponse } from '@/modules/feed/feed.types';

/**
 * POST   /api/v1/posts/[id]/comments/[commentId]/like — izohni yoqtirish.
 * DELETE /api/v1/posts/[id]/comments/[commentId]/like — yoqtirishni olib tashlash.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string; commentId: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const commentId = parseIdParam((await params).commentId);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const result = await likeComment(commentId, auth.userId);

  return apiSuccess<LikeResponse>(result, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const commentId = parseIdParam((await params).commentId);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const result = await unlikeComment(commentId, auth.userId);

  return apiSuccess<LikeResponse>(result, { requestId });
});
