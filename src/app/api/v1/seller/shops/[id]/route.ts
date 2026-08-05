import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { updateSellerShopSchema } from '@/modules/seller/seller.schemas';
import { updateSellerShop } from '@/modules/seller/seller.service';

/**
 * PATCH /api/v1/seller/shops/[id] — do'kon sozlamalari.
 *
 * Eng ko'p ishlatiladigan amal: do'konni vaqtincha yopish. Yopiq
 * do'kon katalogda qolaveradi, lekin buyurtma qabul qilmaydi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Do'kon ID noto'g'ri") });

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.SELLER_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateSellerShopSchema);
  const context = getRequestContext(request);

  const shop = await updateSellerShop(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ shop }, { requestId });
});
