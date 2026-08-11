import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { deleteComment } from '@/modules/feed/feed.service';

/**
 * DELETE /api/v1/posts/[id]/comments/[commentId] — izohni o'chirish.
 *
 * Izoh muallifi ham, post egasi ham o'chira oladi — tekshiruv
 * xizmatda.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string; commentId: string };

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const commentId = parseIdParam((await params).commentId);

  await deleteComment(commentId, auth.userId);

  return apiSuccess({ isDeleted: true }, { requestId });
});
