import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getAuthUser } from '@/modules/auth/auth.service';
import { resolvePermissions } from '@/config/rbac';

/**
 * GET /api/v1/auth/me — joriy foydalanuvchi ma'lumotlari.
 *
 * Rollar token'dan emas, bazadan o'qiladi — foydalanuvchining roli
 * token berilgandan keyin o'zgargan bo'lishi mumkin.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const user = await getAuthUser(auth.userId);

  return apiSuccess(
    {
      user,
      // Frontend qaysi tugmalarni ko'rsatishni shu ro'yxatga qarab hal qiladi.
      permissions: [...resolvePermissions(user.roles)],
      sessionId: auth.sessionId,
    },
    { requestId, headers: { 'cache-control': 'no-store' } },
  );
});
