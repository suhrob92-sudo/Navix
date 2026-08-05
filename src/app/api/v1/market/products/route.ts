import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { productQuerySchema } from '@/modules/market/market.schemas';
import { listProducts } from '@/modules/market/market.service';

/**
 * GET /api/v1/market/products — mahsulotlarni qidirish va filtrlash.
 *
 * Namuna: /api/v1/market/products?search=telefon&category=telefonlar&sort=cheap
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requireAuth(request);
  const query = parseSearchParams(request, productQuerySchema);

  const { products, total } = await listProducts(query);

  return apiSuccess(
    { products, total },
    { requestId, pagination: buildPagination(query.page, query.pageSize, total) },
  );
});
