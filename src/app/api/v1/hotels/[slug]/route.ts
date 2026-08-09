import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { hotelDetailQuerySchema } from '@/modules/hotel/hotel.schemas';
import { getHotel } from '@/modules/hotel/hotel.service';

/**
 * GET /api/v1/hotels/[slug] — mehmonxona va xonalari.
 *
 * Sanalar berilsa, har bir xona uchun BO'SH JOY ham hisoblanadi.
 * Berilmasa — faqat narx va tavsif.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ slug: z.string().trim().min(1).max(120) });

type Params = { slug: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const { slug } = paramsSchema.parse(await params);
  const query = parseSearchParams(request, hotelDetailQuerySchema);

  const hotel = await getHotel(slug, query);

  return apiSuccess({ hotel }, { requestId, headers: { 'cache-control': 'no-store' } });
});
