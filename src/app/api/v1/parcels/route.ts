import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createParcelSchema, parcelQuerySchema } from '@/modules/parcel/parcel.schemas';
import { createParcel, listParcels } from '@/modules/parcel/parcel.service';

/**
 * GET  /api/v1/parcels — mening jo'natmalarim.
 * POST /api/v1/parcels — yangi jo'natma (pul darhol yechiladi).
 *
 * Narx so'rovda YO'Q va bo'lmasligi ham kerak: u serverda tarif
 * bo'yicha qayta hisoblanadi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, parcelQuerySchema);

  const { parcels, total } = await listParcels(auth.userId, query);

  return apiSuccess(
    { parcels },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createParcelSchema);
  const context = getRequestContext(request);

  const parcel = await createParcel(auth.userId, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ parcel }, { requestId, status: 201 });
});
