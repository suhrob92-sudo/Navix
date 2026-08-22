import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { leaveGroup } from '@/modules/chat/group.service';

/**
 * POST /api/v1/chat/groups/[id]/leave — guruhdan chiqish.
 *
 * ── Nima uchun DELETE emas ────────────────────────────────────────────
 * DELETE "guruhni o'chir" degandek tuyulardi. Bu yerda esa guruh
 * qolgan a'zolar uchun yashab qoladi — o'chib ketadigan narsa faqat
 * mening a'zoligim.
 *
 * Javobdagi `deleted` — guruh butunlay o'chirilgani (men oxirgi a'zo
 * edim). Brauzer shunda ro'yxatni yangilaydi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Guruh ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await enforcePublicRateLimit('groupManage', auth.userId);

  const deleted = await leaveGroup(id, auth.userId);

  return apiSuccess({ deleted }, { requestId });
});
