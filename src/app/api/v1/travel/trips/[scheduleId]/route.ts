import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { tripDetailQuerySchema } from '@/modules/travel/travel.schemas';
import { getTrip } from '@/modules/travel/travel.service';

/**
 * GET /api/v1/travel/trips/[scheduleId]?date=2026-08-10 — bitta reys.
 *
 * Reys bazada alohida qator sifatida yo'q, shuning uchun manzilda
 * IKKI qism bor: jadval va sana. Sana shart — usiz "reys" degan
 * tushunchaning o'zi yo'q.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ scheduleId: z.uuid("Reys ID noto'g'ri") });

type Params = { scheduleId: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const { scheduleId } = paramsSchema.parse(await params);
  const query = parseSearchParams(request, tripDetailQuerySchema);

  const trip = await getTrip(scheduleId, query.date);

  return apiSuccess({ trip }, { requestId });
});
