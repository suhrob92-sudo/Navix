import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { usernameParamSchema } from '@/modules/profile/social.schemas';
import { followUser, unfollowUser } from '@/modules/profile/social.service';

/**
 * POST   /api/v1/users/[username]/follow — obuna bo'lish.
 * DELETE /api/v1/users/[username]/follow — obunani bekor qilish.
 *
 * ── Nima uchun cheklov bor ────────────────────────────────────────────
 * Obuna har safar begona odamga bildirishnoma yuboradi. Cheklovsiz
 * skript minglab odamga obuna bo'lib, ularning bildirishnomalarini
 * spam bilan to'ldirib tashlashi mumkin edi.
 */
export const dynamic = 'force-dynamic';

type Params = { username: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const username = usernameParamSchema.parse((await params).username);

  await enforcePublicRateLimit('follow', auth.userId, "Juda tez obuna bo'lyapsiz. Biroz kuting.");

  const result = await followUser(auth.userId, username);

  return apiSuccess(result, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const username = usernameParamSchema.parse((await params).username);

  const result = await unfollowUser(auth.userId, username);

  return apiSuccess(result, { requestId });
});
