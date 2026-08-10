import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { blockUser, unblockUser } from '@/modules/moderation/moderation.service';
import { usernameParamSchema } from '@/modules/profile/social.schemas';
import type { BlockResponse } from '@/modules/moderation/moderation.types';

/**
 * POST   /api/v1/users/[username]/block — bloklash.
 * DELETE /api/v1/users/[username]/block — blokdan chiqarish.
 *
 * ── Nima uchun ikkalasi ham TANASIZ ───────────────────────────────────
 * Bloklashda sozlanadigan hech narsa yo'q: u yo bor, yo yo'q. Amal
 * manzil va usul bilan to'liq ifodalanadi.
 */
export const dynamic = 'force-dynamic';

type Params = { username: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const username = usernameParamSchema.parse((await params).username);

  await enforcePublicRateLimit('userBlock', auth.userId, 'Juda tez bloklayapsiz. Biroz kuting.');

  await blockUser(auth.userId, username);

  return apiSuccess<BlockResponse>({ isBlocked: true }, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const username = usernameParamSchema.parse((await params).username);

  await enforcePublicRateLimit('userBlock', auth.userId, 'Juda tez amal qilyapsiz. Biroz kuting.');

  await unblockUser(auth.userId, username);

  return apiSuccess<BlockResponse>({ isBlocked: false }, { requestId });
});
