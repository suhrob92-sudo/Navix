import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { decideApplicationSchema } from '@/modules/employer/employer.schemas';
import { decideApplication } from '@/modules/employer/employer.service';

/**
 * PATCH /api/v1/employer/applications/[id] — ariza bo'yicha qaror.
 *
 * Ruxsat etilgan holatlar: VIEWED, INVITED, REJECTED.
 * `WITHDRAWN` yo'q — arizani faqat nomzodning o'zi qaytarib oladi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Ariza ID noto'g'ri") });

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.EMPLOYER_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, decideApplicationSchema);
  const context = getRequestContext(request);

  const application = await decideApplication(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ application }, { requestId });
});
