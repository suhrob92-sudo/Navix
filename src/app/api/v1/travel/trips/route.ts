import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
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
  /**
   * Ochiq manzil — chegara MANZIL bo'yicha.
   *
   * Sababi `lib/rate-limit.ts` dagi `publicCatalog` izohida: chegarasiz
   * ochiq katalogni skript bilan butunlay ko'chirib olish mumkin.
   */
  await enforcePublicRateLimit('publicCatalog', getRequestContext(request).ipAddress ?? 'anonim');

  const query = parseSearchParams(request, tripQuerySchema);

  const { trips, total, cities } = await listTrips(query);

  return apiSuccess({ trips, total, cities }, { requestId });
});
