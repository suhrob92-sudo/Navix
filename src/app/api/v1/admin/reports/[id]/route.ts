import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { resolveReportSchema } from '@/modules/moderation/moderation.schemas';
import { resolveReport } from '@/modules/moderation/moderation.service';

/**
 * PATCH /api/v1/admin/reports/[id] — shikoyatni yopish.
 *
 * Faqat holat o'zgaradi: shikoyat matni hech qachon tahrirlanmaydi —
 * u dalil.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.PLATFORM_REPORT_MANAGE);
  const id = parseIdParam((await params).id);
  const input = await parseJsonBody(request, resolveReportSchema);
  const context = getRequestContext(request);

  await resolveReport(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
  });

  return apiSuccess({ status: input.status }, { requestId });
});
