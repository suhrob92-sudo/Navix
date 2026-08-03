import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { updateUserStatusSchema } from '@/modules/admin/admin.schemas';
import { getAdminUser, updateAdminUserStatus } from '@/modules/admin/admin.service';

/**
 * GET   /api/v1/admin/users/[id] — foydalanuvchi haqida batafsil
 * PATCH /api/v1/admin/users/[id] — holatini o'zgartirish (bloklash/tiklash)
 *
 * Bloklash uchun alohida, kuchliroq ruxsat talab qilinadi: ko'rish
 * huquqi bo'lgan xodim bloklay olmasligi kerak.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Foydalanuvchi ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  await requirePermission(request, Permission.PLATFORM_USER_READ);
  const { id } = paramsSchema.parse(await params);

  const user = await getAdminUser(id);

  return apiSuccess({ user }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.PLATFORM_USER_SUSPEND);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateUserStatusSchema);
  const context = getRequestContext(request);

  const user = await updateAdminUserStatus({ userId: auth.userId, roles: auth.roles }, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
  });

  return apiSuccess({ user }, { requestId });
});
