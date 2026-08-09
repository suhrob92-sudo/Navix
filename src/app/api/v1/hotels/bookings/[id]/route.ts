import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getBooking } from '@/modules/hotel/hotel.service';

/**
 * GET /api/v1/hotels/bookings/[id] — bitta bandlov.
 *
 * Egalik serverda tekshiriladi: bandlovda mehmonning ismi va
 * telefon raqami bor.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Bandlov ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const booking = await getBooking(auth.userId, id);

  return apiSuccess({ booking }, { requestId, headers: { 'cache-control': 'no-store' } });
});
