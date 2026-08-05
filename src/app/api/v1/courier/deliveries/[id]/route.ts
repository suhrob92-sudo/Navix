import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { updateDeliveryStatusSchema } from '@/modules/courier/courier.schemas';
import { getDelivery, updateDeliveryStatus } from '@/modules/courier/courier.service';

/**
 * GET   /api/v1/courier/deliveries/[id] — bitta topshiriq
 * PATCH /api/v1/courier/deliveries/[id] — bosqichni o'zgartirish
 *
 * Topshiriqni OLISH bu yerda emas: u raqobatli amal va alohida
 * endpointda (`POST .../accept`).
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Topshiriq ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.COURIER_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);

  const delivery = await getDelivery(auth.userId, id);

  return apiSuccess({ delivery }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.COURIER_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateDeliveryStatusSchema);
  const context = getRequestContext(request);

  const delivery = await updateDeliveryStatus(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ delivery }, { requestId });
});
