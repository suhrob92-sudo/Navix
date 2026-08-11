import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { commentsQuerySchema, createCommentSchema } from '@/modules/feed/feed.schemas';
import { addComment, listComments } from '@/modules/feed/feed.service';

/**
 * GET  /api/v1/posts/[id]/comments — izohlar.
 * POST /api/v1/posts/[id]/comments — izoh yozish.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = await params;
  const query = parseSearchParams(request, commentsQuerySchema);

  const result = await listComments(id, auth.userId, query);

  return apiSuccess(result, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = await params;
  const input = await parseJsonBody(request, createCommentSchema);

  await enforcePublicRateLimit('postComment', auth.userId, "Juda ko'p izoh yozyapsiz. Biroz kuting.");

  const comment = await addComment(id, auth.userId, input.body);

  return apiSuccess({ comment }, { requestId, status: 201 });
});
