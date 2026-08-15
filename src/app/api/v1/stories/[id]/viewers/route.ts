import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listStoryViewers } from '@/modules/story/story.service';
import type { StoryViewersResponse } from '@/modules/story/story.types';

/**
 * GET /api/v1/stories/[id]/viewers — hikoyani kim ko'rgan.
 *
 * FAQAT hikoya egasiga: bu ro'yxat odamlarning xatti-harakati
 * haqidagi ma'lumot va u begonaga tegishli emas.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  const result = await listStoryViewers(id, auth.userId);

  return apiSuccess<StoryViewersResponse>(result, {
    requestId,
    headers: { 'cache-control': 'no-store' },
  });
});
