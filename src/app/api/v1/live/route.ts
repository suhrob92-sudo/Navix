import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createLiveSchema, liveQuerySchema } from '@/modules/live/live.schemas';
import { listLiveStreams, scheduleLive } from '@/modules/live/live.service';

/**
 * GET  /api/v1/live — efirlar ro'yxati.
 * POST /api/v1/live — yangi efir e'loni.
 *
 * `?mine=1` — faqat o'z efirlarim (bekor qilinganlari ham).
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, liveQuerySchema);

  const result = await listLiveStreams(auth.userId, { mine: query.mine, limit: query.limit });

  return apiSuccess(result, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createLiveSchema);

  await enforcePublicRateLimit('postCreate', auth.userId, "Juda ko'p efir e'lon qilyapsiz. Biroz kuting.");

  const stream = await scheduleLive(auth.userId, input);

  return apiSuccess({ stream }, { requestId, status: 201 });
});
