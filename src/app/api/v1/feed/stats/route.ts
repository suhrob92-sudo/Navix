import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listVideoStats } from '@/modules/feed/video-stats.service';
import type { VideoStatsResponse } from '@/modules/feed/feed.types';

/**
 * GET /api/v1/feed/stats — MENING videolarimning natijasi.
 *
 * Ro'yxat doim so'rov yuborgan odamning o'z videolaridan iborat:
 * begonaning ko'rsatkichini ko'rish uchun hech qanday yo'l yo'q.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const result = await listVideoStats(auth.userId);

  return apiSuccess<VideoStatsResponse>(result, {
    requestId,
    headers: { 'cache-control': 'no-store' },
  });
});
