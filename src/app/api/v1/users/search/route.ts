import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { userSearchQuerySchema } from '@/modules/profile/social.schemas';
import { searchUsers } from '@/modules/profile/social.service';

/**
 * GET /api/v1/users/search — odamlarni ism yoki @nom bo'yicha qidirish.
 *
 * ── Nima uchun `[username]` bilan to'qnashmaydi ───────────────────────
 * Yonida `/api/v1/users/[username]` yo'li bor. Next.js aniq nomni
 * o'zgaruvchidan USTUN qo'yadi, shuning uchun `/users/search` doim shu
 * yerga tushadi.
 *
 * Bundan tashqari `search` so'zi band nomlar ro'yxatida — hech kim uni
 * o'ziga foydalanuvchi nomi qilib ololmaydi.
 *
 * ── Nima uchun faqat tizimga kirganlarga ──────────────────────────────
 * Ochiq qoldirilsa, istalgan odam foydalanuvchilar ro'yxatini birma-bir
 * yig'ib olardi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  await enforcePublicRateLimit('userSearch', auth.userId);

  const { q, limit } = parseSearchParams(request, userSearchQuerySchema);

  const users = await searchUsers(auth.userId, q, limit);

  return apiSuccess({ users }, { requestId });
});
