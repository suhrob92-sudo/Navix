import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { updatePostSchema } from '@/modules/feed/feed.schemas';
import { deletePost, getPost, updatePost } from '@/modules/feed/feed.service';

/**
 * GET    /api/v1/posts/[id] — bitta post.
 * PATCH  /api/v1/posts/[id] — matnni tahrirlash (faqat muallif).
 * DELETE /api/v1/posts/[id] — postni o'chirish (faqat muallif).
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  const post = await getPost(id, auth.userId);

  return apiSuccess({ post }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await deletePost(id, auth.userId);

  return apiSuccess({ isDeleted: true }, { requestId });
});

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);
  const input = await parseJsonBody(request, updatePostSchema);

  const post = await updatePost(id, auth.userId, input.body, input.category);

  return apiSuccess({ post }, { requestId });
});
