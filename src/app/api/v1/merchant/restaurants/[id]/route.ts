import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { updateRestaurantSchema } from '@/modules/merchant/merchant.schemas';
import { updateMerchantRestaurant } from '@/modules/merchant/merchant.service';

/**
 * PATCH /api/v1/merchant/restaurants/[id] — restoranni ochish/yopish
 * va yetkazish vaqtini o'zgartirish.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Restoran ID noto'g'ri") });

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.MERCHANT_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateRestaurantSchema);

  const restaurant = await updateMerchantRestaurant(auth.userId, id, input);

  return apiSuccess({ restaurant }, { requestId });
});
