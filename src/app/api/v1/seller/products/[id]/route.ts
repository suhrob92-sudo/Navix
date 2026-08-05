import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { updateSellerProductSchema } from '@/modules/seller/seller.schemas';
import { updateSellerProduct } from '@/modules/seller/seller.service';

/**
 * PATCH /api/v1/seller/products/[id] — narx, zaxira, tavsif, holat.
 *
 * Do'kon ID'si manzilda yo'q: egalik mahsulotning O'ZIDAN tekshiriladi
 * (`product.shop.ownerId = userId`). Shu sababli begona mahsulotni
 * "o'z do'konim" deb ko'rsatib bo'lmaydi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Mahsulot ID noto'g'ri") });

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.SELLER_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateSellerProductSchema);
  const context = getRequestContext(request);

  const product = await updateSellerProduct(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ product }, { requestId });
});
