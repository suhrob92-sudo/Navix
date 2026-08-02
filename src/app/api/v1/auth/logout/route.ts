import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { AuditAction, recordAudit } from '@/lib/audit';
import { getRequestContext } from '@/lib/request-context';
import { REFRESH_COOKIE_NAME, clearRefreshCookie } from '@/modules/auth/auth.cookies';
import { optionalAuth } from '@/modules/auth/auth.guard';
import { revokeSession } from '@/modules/auth/session.service';
import { verifyRefreshToken } from '@/modules/auth/token.service';

/**
 * POST /api/v1/auth/logout — tizimdan chiqish.
 *
 * Joriy sessiya bekor qilinadi va cookie o'chiriladi.
 * Boshqa qurilmalardagi sessiyalar ishlashda davom etadi.
 *
 * Token yaroqsiz bo'lsa ham 200 qaytadi — chiqish har doim muvaffaqiyatli
 * bo'lishi kerak, aks holda foydalanuvchi "chiqa olmay" qoladi.
 */
export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const context = getRequestContext(request);

  // Sessiya ID'sini avval access token'dan, bo'lmasa refresh cookie'dan olamiz.
  const auth = await optionalAuth(request);
  let sessionId = auth?.sessionId ?? null;
  let userId = auth?.userId ?? null;

  if (!sessionId) {
    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

    if (refreshToken) {
      try {
        const payload = await verifyRefreshToken(refreshToken);
        sessionId = payload.sessionId;
        userId = payload.userId;
      } catch {
        // Token yaroqsiz — bekor qilishga hojat yo'q, shunchaki cookie tozalanadi.
      }
    }
  }

  if (sessionId) {
    await revokeSession(sessionId);

    await recordAudit({
      actorId: userId,
      action: AuditAction.USER_LOGOUT,
      resourceType: 'Session',
      resourceId: sessionId,
      module: 'auth',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId,
    });
  }

  const response = apiSuccess({ loggedOut: true }, { requestId });
  clearRefreshCookie(response);

  return response;
});
