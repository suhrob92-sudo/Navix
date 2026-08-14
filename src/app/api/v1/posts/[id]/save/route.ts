import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { savePost, unsavePost } from '@/modules/feed/feed.service';
import type { SaveResponse } from '@/modules/feed/feed.types';

/**
 * POST   /api/v1/posts/[id]/save — saqlash.
 * DELETE /api/v1/posts/[id]/save — saqlanganlardan olib tashlash.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const result = await savePost(id, auth.userId);

  return apiSuccess<SaveResponse>(result, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const result = await unsavePost(id, auth.userId);

  return apiSuccess<SaveResponse>(result, { requestId });
});
