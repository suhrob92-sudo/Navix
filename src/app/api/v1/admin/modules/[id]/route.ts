import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { setModuleEnabledSchema } from '@/modules/admin/admin.schemas';
import { setModuleEnabled } from '@/modules/admin/module-switch.service';

/**
 * PATCH /api/v1/admin/modules/[id] — bo'limni yopish yoki qayta ochish.
 *
 * ID — bu `AppModule.id` ("food", "marketplace"), UUID emas: bo'limlar
 * kodda e'lon qilingan va ularning identifikatori barqaror nom.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(40)
    // Faqat kichik harf va chiziqcha — reyestrdagi nomlar shunday.
    .regex(/^[a-z][a-z-]*$/, "Bo'lim nomi noto'g'ri"),
});

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.PLATFORM_MODULE_MANAGE);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, setModuleEnabledSchema);
  const context = getRequestContext(request);

  const updated = await setModuleEnabled(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
  });

  return apiSuccess({ module: updated }, { requestId });
});
