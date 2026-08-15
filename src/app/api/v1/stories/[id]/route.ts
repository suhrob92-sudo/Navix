import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { deleteStory } from '@/modules/story/story.service';

/** DELETE /api/v1/stories/[id] — o'z hikoyasini o'chirish. */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await deleteStory(id, auth.userId);

  return apiSuccess({ deleted: true }, { requestId });
});
