import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { usernameAvailabilityQuerySchema } from '@/modules/profile/profile.schemas';
import { isUsernameAvailable } from '@/modules/profile/profile.service';

/**
 * GET /api/v1/profile/username?username=aziz — nom bo'shmi.
 *
 * ── Nima uchun alohida endpoint ───────────────────────────────────────
 * Foydalanuvchi nomni yozayotgan paytda javob olishi kerak. Saqlashni
 * bosgandan keyin "band ekan" deb aytish — butun formani qayta
 * to'ldirishga majbur qilardi.
 *
 * ── Nima uchun KIRISH talab qilinadi ──────────────────────────────────
 * Ochiq bo'lsa, bu endpoint orqali qaysi nomlar bandligini ro'yxat
 * qilib olish mumkin edi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, usernameAvailabilityQuerySchema);

  const available = await isUsernameAvailable(query.username, auth.userId);

  return apiSuccess({ available }, { requestId, headers: { 'cache-control': 'no-store' } });
});
