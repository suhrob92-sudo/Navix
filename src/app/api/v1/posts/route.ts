import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createPostSchema } from '@/modules/feed/feed.schemas';
import { createPost } from '@/modules/feed/feed.service';

/**
 * POST /api/v1/posts — yangi post yozish.
 */
export const dynamic = 'force-dynamic';

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createPostSchema);

  await enforcePublicRateLimit('postCreate', auth.userId, "Juda ko'p post yozyapsiz. Biroz kuting.");

  const post = await createPost(auth.userId, input.body, input.imageUrl ?? null);

  return apiSuccess({ post }, { requestId, status: 201 });
});
