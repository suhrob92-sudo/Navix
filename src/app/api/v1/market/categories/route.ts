import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listCategories } from '@/modules/market/market.service';

/** GET /api/v1/market/categories — mahsulot toifalari. */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requireAuth(request);

  const categories = await listCategories();

  return apiSuccess({ categories }, { requestId });
});
