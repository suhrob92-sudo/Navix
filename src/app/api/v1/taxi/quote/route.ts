import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { taxiQuoteSchema } from '@/modules/taxi/taxi.schemas';
import { quoteRide } from '@/modules/taxi/taxi.service';

/**
 * GET /api/v1/taxi/quote — narxni oldindan hisoblaydi.
 *
 * Hech narsa saqlanmaydi va pul harakatlanmaydi: mijoz manzilni
 * surganda ekran shu so'rovni qayta-qayta yuboradi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requireAuth(request);

  const input = parseSearchParams(request, taxiQuoteSchema);
  const quote = quoteRide(input);

  return apiSuccess({ quote }, { requestId, headers: { 'cache-control': 'no-store' } });
});
