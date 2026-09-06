import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getRide } from '@/modules/taxi/taxi.service';

/**
 * GET /api/v1/taxi/rides/[id] — bitta safar.
 *
 * Ekran shu yo'lni bir necha soniyada qayta so'raydi: haydovchining
 * joylashuvi va safar holati shu javobdan keladi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Safar ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const ride = await getRide(auth.userId, id);

  return apiSuccess({ ride }, { requestId, headers: { 'cache-control': 'no-store' } });
});
