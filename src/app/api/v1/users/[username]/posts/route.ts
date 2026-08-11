import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { feedQuerySchema } from '@/modules/feed/feed.schemas';
import { listUserPosts } from '@/modules/feed/feed.service';
import { usernameParamSchema } from '@/modules/profile/social.schemas';

/**
 * GET /api/v1/users/[username]/posts — bitta odamning postlari.
 *
 * Lenta bilan bir xil belgi (cursor) ishlatiladi — brauzer tomonida
 * bitta ro'yxat komponenti ikkalasiga ham xizmat qiladi.
 */
export const dynamic = 'force-dynamic';

type Params = { username: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const username = usernameParamSchema.parse((await params).username);
  const query = parseSearchParams(request, feedQuerySchema);

  const result = await listUserPosts(auth.userId, username, query);

  return apiSuccess(result, { requestId, headers: { 'cache-control': 'no-store' } });
});
