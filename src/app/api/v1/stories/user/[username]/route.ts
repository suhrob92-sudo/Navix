import type { NextRequest } from 'next/server';

import { NotFoundError } from '@/lib/api/errors';
import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listUserStories } from '@/modules/story/story.service';
import type { StoryGroupView } from '@/modules/story/story.types';

/**
 * GET /api/v1/stories/user/[username] — bitta odamning hikoyalari.
 *
 * Halqadan farqi: bu yerda OBUNA shart emas. Odam profilga kirib
 * hikoyani ko'rmoqchi bo'lsa, to'sqinlik qilishning ma'nosi yo'q.
 */
export const dynamic = 'force-dynamic';

type Params = { username: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { username } = await params;

  const group = await listUserStories(username, auth.userId);

  if (!group) {
    throw new NotFoundError('Hikoya');
  }

  return apiSuccess<{ group: StoryGroupView }>({ group }, {
    requestId,
    headers: { 'cache-control': 'no-store' },
  });
});
