import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { markStorySeen } from '@/modules/story/story.service';

/**
 * POST /api/v1/stories/[id]/seen — hikoya ko'rildi.
 *
 * Bir odam bir hikoyani BIR MARTA ko'rgan hisoblanadi: takroriy
 * so'rov bazada hech narsa o'zgartirmaydi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('videoView', auth.userId, "Juda ko'p so'rov. Biroz kuting.");

  await markStorySeen(id, auth.userId);

  return apiSuccess({ seen: true }, { requestId });
});
