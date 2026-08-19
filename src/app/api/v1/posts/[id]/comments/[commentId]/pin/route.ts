import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { pinComment } from '@/modules/feed/feed.service';

/**
 * POST   /api/v1/posts/[id]/comments/[commentId]/pin — mahkamlash.
 * DELETE /api/v1/posts/[id]/comments/[commentId]/pin — bo'shatish.
 *
 * Faqat POST MUALLIFI. Mahkamlash "bu javob to'g'ri" degan tasdiq:
 * uni istalgan odam qila olsa, u tasdiq bo'lishdan to'xtardi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string; commentId: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const commentId = parseIdParam((await params).commentId);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const result = await pinComment(commentId, auth.userId, true);

  return apiSuccess(result, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const commentId = parseIdParam((await params).commentId);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const result = await pinComment(commentId, auth.userId, false);

  return apiSuccess(result, { requestId });
});
