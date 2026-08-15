import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getOwnProfile } from '@/modules/profile/social.service';
import type { PublicProfileResponse } from '@/modules/profile/social.types';

/**
 * GET /api/v1/feed/me — o'z ijodkor profilim.
 *
 * Feed profil sahifasi uchun: nom, rasm, postlar va obunachilar soni.
 * Javob turi ochiq profil bilan BIR XIL — ekran ikkalasini bir xil
 * chizadi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const profile = await getOwnProfile(auth.userId);

  return apiSuccess<PublicProfileResponse>({ profile }, { requestId, headers: { 'cache-control': 'no-store' } });
});
