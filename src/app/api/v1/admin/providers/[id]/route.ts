import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { updateProviderSchema } from '@/modules/admin/admin.schemas';
import { getAdminProvider, updateAdminProvider } from '@/modules/admin/admin.service';

/**
 * GET   /api/v1/admin/providers/[id] — bitta xizmat (tahrirlash formasi uchun)
 * PATCH /api/v1/admin/providers/[id] — xizmatni tahrirlash
 *
 * O'CHIRISH endpointi ataylab YO'Q. Provayder o'chirilsa, unga bog'langan
 * to'lovlar tarixi buzilardi (`onDelete: Restrict`). Uning o'rniga
 * `isActive: false` qilinadi — ro'yxatdan yo'qoladi, tarix esa qoladi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Xizmat ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  await requirePermission(request, Permission.PLATFORM_ADMIN_ACCESS);
  const { id } = paramsSchema.parse(await params);

  const provider = await getAdminProvider(id);

  return apiSuccess({ provider }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.PLATFORM_PROVIDER_MANAGE);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateProviderSchema);
  const context = getRequestContext(request);

  const provider = await updateAdminProvider(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
  });

  return apiSuccess({ provider }, { requestId });
});
