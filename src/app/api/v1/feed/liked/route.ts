import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { hashtagQuerySchema } from '@/modules/feed/feed.schemas';
import { listLikedPosts } from '@/modules/feed/feed.service';

/**
 * GET /api/v1/feed/liked — men yoqtirgan postlar.
 *
 * Ro'yxat YOQTIRISH vaqti bo'yicha tartiblanadi: odam "kecha
 * yoqtirgan videomni" izlaydi, "kecha joylangan" ni emas.
 *
 * Faqat O'ZIMNIKI: boshqa odamning nimani yoqtirgani shaxsiy
 * ma'lumot va uni ochib bo'lmaydi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, hashtagQuerySchema);

  const result = await listLikedPosts(auth.userId, query.cursor, query.limit);

  return apiSuccess(result, { requestId, headers: { 'cache-control': 'no-store' } });
});
