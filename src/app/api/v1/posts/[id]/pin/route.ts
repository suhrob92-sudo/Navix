import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { pinPost, unpinPost } from '@/modules/feed/feed.service';

/**
 * POST   /api/v1/posts/[id]/pin — profilda yuqoriga mahkamlash.
 * DELETE /api/v1/posts/[id]/pin — bo'shatish.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Profil vaqt bo'yicha tartiblangan va ijodkorning eng yaxshi ishi
 * ko'pincha eskiroq bo'ladi. Yangi kelgan odam esa profilning
 * boshidan qaraydi — u yerda tasodifiy post turgani ijodkorning eng
 * yomon reklamasi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  return apiSuccess(await pinPost(id, auth.userId), { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  return apiSuccess(await unpinPost(id, auth.userId), { requestId });
});
