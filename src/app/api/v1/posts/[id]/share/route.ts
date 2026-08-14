import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { markShared } from '@/modules/feed/feed.service';
import type { ShareResponse } from '@/modules/feed/feed.types';

/**
 * POST /api/v1/posts/[id]/share — post ulashildi.
 *
 * Ulashishning O'ZI brauzerda bajariladi (havola nusxalanadi yoki
 * Telegramga uzatiladi). Bu yerda faqat SON oshiriladi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('postShare', auth.userId, "Juda ko'p so'rov. Biroz kuting.");

  const result = await markShared(id, auth.userId);

  return apiSuccess<ShareResponse>(result, { requestId });
});
