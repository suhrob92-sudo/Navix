import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { setContentVisibleSchema } from '@/modules/admin/admin.schemas';
import { CONTENT_KINDS, setContentVisible } from '@/modules/admin/content.service';

/**
 * PATCH /api/v1/admin/content/[kind]/[id] — yashirish yoki qaytarish.
 *
 * Tur manzilda turadi, tanada emas: shunda bitta ID bilan noto'g'ri
 * turdagi jadvalga tegib ketish mumkin emas.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  kind: z.enum(CONTENT_KINDS),
  id: z.uuid("Yozuv ID noto'g'ri"),
});

type Params = { kind: string; id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.PLATFORM_CONTENT_MANAGE);
  const { kind, id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, setContentVisibleSchema);
  const context = getRequestContext(request);

  const item = await setContentVisible(auth.userId, kind, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
  });

  return apiSuccess({ item }, { requestId });
});
