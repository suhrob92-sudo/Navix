import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { reportUserSchema } from '@/modules/moderation/moderation.schemas';
import { reportPost } from '@/modules/moderation/moderation.service';

/**
 * POST /api/v1/posts/[id]/report — post ustidan shikoyat.
 *
 * Chegara bor: shikoyat tugmasi ham qurol bo'lishi mumkin — bir
 * odam o'nlab postga shikoyat yozib, moderator navbatini
 * to'ldirib qo'yishi mumkin.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);
  const input = await parseJsonBody(request, reportUserSchema);

  await enforcePublicRateLimit('report', auth.userId, "Juda ko'p shikoyat yubordingiz. Biroz kuting.");

  await reportPost(auth.userId, id, input);

  return apiSuccess({ isReported: true }, { requestId, status: 201 });
});
