import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { changePasswordSchema } from '@/modules/profile/profile.schemas';
import { changePassword } from '@/modules/profile/profile.service';

/**
 * POST /api/v1/profile/password — parolni o'zgartirish.
 *
 * Joriy parol so'raladi: agar qurilma ochiq qolgan bo'lsa, begona odam
 * parolni o'zgartirib hisobni egallab ololmaydi.
 *
 * Parol o'zgargach joriy qurilmadan TASHQARI barcha sessiyalar yopiladi.
 */
export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, changePasswordSchema);
  const context = getRequestContext(request);

  const result = await changePassword(auth.userId, input, {
    currentSessionId: auth.sessionId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
  });

  return apiSuccess(
    {
      passwordChanged: true,
      revokedSessions: result.revokedSessions,
      message:
        result.revokedSessions > 0
          ? `Parol yangilandi. ${result.revokedSessions} ta boshqa qurilma tizimdan chiqarildi.`
          : 'Parol yangilandi.',
    },
    { requestId },
  );
});
