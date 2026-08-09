import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { tripQuerySchema } from '@/modules/travel/travel.schemas';
import { listTrips } from '@/modules/travel/travel.service';

/**
 * GET /api/v1/travel/trips — reys qidirish.
 *
 * Kirish SHART EMAS: odam avval qanday reyslar borligini va narxni
 * ko'rib, keyin ro'yxatdan o'tishga qaror qiladi. Chipta esa faqat
 * kirgandan keyin olinadi.
 *
 * Javob sahifalanmaydi — sabab `travel.service.ts` da.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const query = parseSearchParams(request, tripQuerySchema);

  const { trips, total, cities } = await listTrips(query);

  return apiSuccess({ trips, total, cities }, { requestId });
});
