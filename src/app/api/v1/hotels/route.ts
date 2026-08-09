import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { hotelQuerySchema } from '@/modules/hotel/hotel.schemas';
import { listHotels } from '@/modules/hotel/hotel.service';

/**
 * GET /api/v1/hotels — mehmonxonalar ro'yxati.
 *
 * Kirish SHART EMAS: odam avval nima borligini ko'rib, keyin
 * ro'yxatdan o'tishga qaror qiladi. Bandlov esa faqat kirgandan
 * keyin.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const query = parseSearchParams(request, hotelQuerySchema);

  const { hotels, total, cities } = await listHotels(query);

  return apiSuccess(
    { hotels, cities },
    { requestId, pagination: buildPagination(query.page, query.pageSize, total) },
  );
});
