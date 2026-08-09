import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { keepCallAlive } from '@/modules/call/call.service';

/**
 * POST /api/v1/calls/[id]/alive — "men hali gaplashyapman".
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Brauzer to'satdan yopilsa (ilova o'chirildi, telefon o'chdi),
 * "tugatish" so'rovi yuborilmaydi. Qo'ng'iroq esa bazada "ketmoqda"
 * bo'lib qolaveradi va odam boshqa hech kimga qo'ng'iroq qila olmaydi.
 *
 * Shuning uchun gaplashayotgan tomon vaqti-vaqti bilan shu yerga
 * xabar beradi. Xabar kelmay qolsa — brauzer yopilgan.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Qo'ng'iroq ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await keepCallAlive(id, auth.userId);

  return apiSuccess({ ok: true }, { requestId });
});
