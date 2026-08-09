import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { cancelBookingSchema } from '@/modules/hotel/hotel.schemas';
import { cancelBooking } from '@/modules/hotel/hotel.service';

/**
 * POST /api/v1/hotels/bookings/[id]/cancel — bekor qilish va pulni qaytarish.
 *
 * Faqat KIRISH sanasidan oldin mumkin.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Bandlov ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, cancelBookingSchema);
  const context = getRequestContext(request);

  const booking = await cancelBooking(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ booking }, { requestId });
});
