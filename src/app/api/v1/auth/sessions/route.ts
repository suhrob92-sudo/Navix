import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { AuditAction, recordAudit } from '@/lib/audit';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listActiveSessions, revokeAllSessions } from '@/modules/auth/session.service';

/**
 * Foydalanuvchining faol qurilmalari bilan ishlash.
 *
 * GET    — barcha faol sessiyalar ro'yxati ("Qurilmalarim" sahifasi uchun);
 * DELETE — joriy qurilmadan tashqari hammasini chiqarish.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const sessions = await listActiveSessions(auth.userId);

  return apiSuccess(
    {
      sessions: sessions.map((session) => ({
        ...session,
        /** Foydalanuvchi hozir shu qurilmadan kirgan. */
        isCurrent: session.id === auth.sessionId,
      })),
    },
    { requestId, headers: { 'cache-control': 'no-store' } },
  );
});

export const DELETE = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const context = getRequestContext(request);

  const revokedCount = await revokeAllSessions(auth.userId, auth.sessionId);

  await recordAudit({
    actorId: auth.userId,
    action: AuditAction.SESSION_REVOKED,
    resourceType: 'Session',
    resourceId: auth.sessionId,
    module: 'auth',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
    metadata: { revokedCount, scope: 'others' },
  });

  return apiSuccess({ revokedCount }, { requestId });
});
