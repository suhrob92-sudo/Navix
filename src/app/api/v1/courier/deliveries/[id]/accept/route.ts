import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { acceptDelivery } from '@/modules/courier/courier.service';

/**
 * POST /api/v1/courier/deliveries/[id]/accept — topshiriqni o'ziga olish.
 *
 * ── Nima uchun ALOHIDA endpoint ──────────────────────────────────────
 * Bu boshqa bosqichlardan farq qiladi: topshiriqning hali egasi yo'q
 * va o'nta kuryer bir vaqtda bosishi mumkin. Yutqazgan kuryer
 * "boshqa kuryer oldi" degan ANIQ javob olishi kerak, "holat
 * o'zgardi" degan umumiy xabar emas.
 *
 * `DELIVERY_ORDER_ACCEPT` ruxsati ham aynan shu amal uchun: kabinetni
 * ko'rish (`COURIER_DASHBOARD_ACCESS`) va topshiriq olish alohida
 * huquqlar.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Topshiriq ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.DELIVERY_ORDER_ACCEPT);
  const { id } = paramsSchema.parse(await params);
  const context = getRequestContext(request);

  const delivery = await acceptDelivery(auth.userId, id, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ delivery }, { requestId });
});
