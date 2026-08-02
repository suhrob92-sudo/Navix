import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { AuditAction, recordAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { revokeSession } from '@/modules/auth/session.service';

/**
 * DELETE /api/v1/auth/sessions/[id] — bitta qurilmani tizimdan chiqarish.
 *
 * "Telefonimni yo'qotdim" holati uchun: foydalanuvchi boshqa qurilmadan
 * kirib, yo'qolgan telefondagi sessiyani yopadi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.string().uuid("Sessiya ID noto'g'ri") });

type Params = { id: string };

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  // Joriy qurilmani shu yerdan yopib bo'lmaydi — buning uchun `/logout` bor.
  // Aks holda foydalanuvchi "chiqdimmi yoki yo'qmi" degan noaniq holatda qoladi.
  if (id === auth.sessionId) {
    throw new ValidationError('Joriy qurilmadan chiqish uchun "Chiqish" tugmasidan foydalaning');
  }

  const session = await prisma.session.findFirst({
    where: { id, userId: auth.userId },
    select: { id: true, deviceLabel: true },
  });

  if (!session) {
    throw new NotFoundError('Qurilma');
  }

  await revokeSession(id);

  const context = getRequestContext(request);

  await recordAudit({
    actorId: auth.userId,
    action: AuditAction.SESSION_REVOKED,
    resourceType: 'Session',
    resourceId: id,
    module: 'auth',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
    metadata: { scope: 'single', deviceLabel: session.deviceLabel },
  });

  return apiSuccess({ revoked: true }, { requestId });
});
