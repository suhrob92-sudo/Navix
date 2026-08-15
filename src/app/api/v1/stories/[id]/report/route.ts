import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { reportUserSchema } from '@/modules/moderation/moderation.schemas';
import { reportStory } from '@/modules/moderation/moderation.service';

/**
 * POST /api/v1/stories/[id]/report — hikoya ustidan shikoyat.
 *
 * Hikoya 24 soatdan keyin yo'qoladi, lekin YOZUVI qoladi — moderator
 * shikoyat kelgan paytda tekshiradigan narsa topa oladi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);
  const input = await parseJsonBody(request, reportUserSchema);

  await enforcePublicRateLimit('report', auth.userId, "Juda ko'p shikoyat yubordingiz. Biroz kuting.");

  await reportStory(auth.userId, id, input);

  return apiSuccess({ isReported: true }, { requestId, status: 201 });
});
