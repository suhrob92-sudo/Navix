import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { bookingQuerySchema, createBookingSchema } from '@/modules/hotel/hotel.schemas';
import { createBooking, listBookings } from '@/modules/hotel/hotel.service';

/**
 * GET  /api/v1/hotels/bookings — mening bandlovlarim.
 * POST /api/v1/hotels/bookings — xona band qilish (pul darhol yechiladi).
 *
 * Summa so'rovda YO'Q: u sanalardan va xona narxidan serverda
 * hisoblanadi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, bookingQuerySchema);

  const { bookings, total } = await listBookings(auth.userId, query);

  return apiSuccess(
    { bookings },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createBookingSchema);
  const context = getRequestContext(request);

  const booking = await createBooking(auth.userId, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ booking }, { requestId, status: 201 });
});
