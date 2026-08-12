import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { clearRefreshCookie } from '@/modules/auth/auth.cookies';
import { requireAuth } from '@/modules/auth/auth.guard';
import { deleteAccount } from '@/modules/profile/account.service';
import { deleteAccountSchema, updateProfileSchema } from '@/modules/profile/profile.schemas';
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

/**
 * DELETE /api/v1/profile — hisobni yopish.
 *
 * ── Nima uchun cookie ham TOZALANADI ──────────────────────────────────
 * Sessiyalar bazada bekor qilinadi, lekin brauzerdagi `httpOnly`
 * cookie o'z-o'zidan yo'qolmaydi. U qolsa, sahifa yangilanganda ilova
 * yana kirishga urinardi va tushunarsiz xato ko'rsatardi.
 */
export const DELETE = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, deleteAccountSchema);
  const context = getRequestContext(request);

  await deleteAccount(auth.userId, input.password, { ...context, requestId });

  const response = apiSuccess({ isDeleted: true }, { requestId });
  clearRefreshCookie(response);

  return response;
});
