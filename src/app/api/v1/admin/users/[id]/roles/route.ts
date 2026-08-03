import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { updateUserRoleSchema } from '@/modules/admin/admin.schemas';
import { updateUserRole } from '@/modules/admin/admin.service';

/**
 * PATCH /api/v1/admin/users/[id]/roles — rol berish yoki olib tashlash.
 *
 * `PLATFORM_ROLE_MANAGE` ruxsati FAQAT `SUPER_ADMIN` da. Sababi oddiy:
 * bu ruxsatga ega odam istalgan hisobga istalgan huquqni bera oladi,
 * ya'ni u butun tizimning kaliti.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Foydalanuvchi ID noto'g'ri") });

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.PLATFORM_ROLE_MANAGE);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateUserRoleSchema);
  const context = getRequestContext(request);

  const user = await updateUserRole({ userId: auth.userId, roles: auth.roles }, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
  });

  return apiSuccess({ user }, { requestId });
});
