import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listBlocked } from '@/modules/moderation/moderation.service';
import type { BlockedListResponse } from '@/modules/moderation/moderation.types';

/**
 * GET /api/v1/profile/blocked — men bloklagan odamlar.
 *
 * ── Nima uchun `/users/blocked` EMAS ──────────────────────────────────
 * `/api/v1/users/[username]` manzili allaqachon band. Uning yoniga
 * `/api/v1/users/blocked` qo'yilsa, u "blocked" nomli haqiqiy
 * foydalanuvchining profilini abadiy to'sib qo'yardi.
 *
 * Ro'yxat esa mening sozlamalarim — shuning uchun u profil ostida.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const users = await listBlocked(auth.userId);

  return apiSuccess<BlockedListResponse>({ users }, { requestId, headers: { 'cache-control': 'no-store' } });
});
