import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { hidePost, unhidePost } from '@/modules/feed/feed.service';
import type { HideResponse } from '@/modules/feed/feed.types';

/**
 * POST   /api/v1/posts/[id]/hide — "Bu qiziq emas".
 * DELETE /api/v1/posts/[id]/hide — yashirishni qaytarish.
 *
 * ── Nima uchun bu manzil SHIKOYATDAN alohida ──────────────────────────
 * Shikoyat moderatorga boradi va boshqalarga ham ta'sir qiladi.
 * Bu esa faqat bitta odamning lentasini o'zgartiradi va hech kimga
 * ko'rinmaydi. Ikkalasini bitta manzilga birlashtirsak, javob
 * "kimga ta'sir qildi?" degan savolga aralash javob berardi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const result = await hidePost(id, auth.userId);

  return apiSuccess<HideResponse>(result, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const result = await unhidePost(id, auth.userId);

  return apiSuccess<HideResponse>(result, { requestId });
});
