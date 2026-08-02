import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { updateProfileSchema } from '@/modules/profile/profile.schemas';
import { getProfile, updateProfile } from '@/modules/profile/profile.service';

/**
 * GET   /api/v1/profile — profil ma'lumotlarini olish
 * PATCH /api/v1/profile — profilni qisman yangilash
 *
 * PATCH ishlatilgan, PUT emas: faqat o'zgargan maydonlar yuboriladi,
 * qolganlari tegilmaydi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const profile = await getProfile(auth.userId);

  return apiSuccess(profile, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const PATCH = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, updateProfileSchema);

  const profile = await updateProfile(auth.userId, input);

  return apiSuccess(profile, { requestId });
});
