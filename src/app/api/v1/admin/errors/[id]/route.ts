import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { resolveErrorSchema } from '@/modules/error-log/error-log.schemas';
import { setErrorResolved } from '@/modules/error-log/error-log.service';

/**
 * PATCH /api/v1/admin/errors/[id] — xatoni "ko'rib chiqildi" deb belgilash.
 *
 * Xatoning O'ZI tahrirlanmaydi: u dalil. Faqat holati o'zgaradi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  await requirePermission(request, Permission.PLATFORM_AUDIT_READ);
  const id = parseIdParam((await params).id);
  const input = await parseJsonBody(request, resolveErrorSchema);

  await setErrorResolved(id, input.isResolved);

  return apiSuccess({ isResolved: input.isResolved }, { requestId });
});
