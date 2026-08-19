import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { setLiveReminder } from '@/modules/live/live.service';

/**
 * POST   /api/v1/live/[id]/reminder — "eslatib qo'y".
 * DELETE /api/v1/live/[id]/reminder — eslatmani olib tashlash.
 *
 * Efir boshlanganda FAQAT shu ro'yxatdagilarga xabar boradi. Barcha
 * obunachiga yuborilsa, odamlar xabarlarni butunlay o'chirib
 * qo'yardi — va keyin haqiqatan muhim xabar ham yetib bormasdi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const result = await setLiveReminder(id, auth.userId, true);

  return apiSuccess(result, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const result = await setLiveReminder(id, auth.userId, false);

  return apiSuccess(result, { requestId });
});
