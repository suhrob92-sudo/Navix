import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { leaveGroupCall } from '@/modules/call/call.service';

/**
 * POST /api/v1/calls/[id]/leave — guruh suhbatidan chiqish.
 *
 * ── Nima uchun `end` dan alohida ──────────────────────────────────────
 * `end` butun qo'ng'iroqni yopadi. Guruhda esa bir odam chiqsa,
 * qolganlar davom etaveradi — suhbat faqat oxirgi odam chiqqanda
 * yopiladi.
 *
 * ── Nima uchun cheklov yo'q ───────────────────────────────────────────
 * Chiqish — bu to'xtatuvchi amal. Uni cheklash "chiqa olmayapman"
 * degan holatni yaratardi, bu esa qo'ng'iroqda eng yomon narsa.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Qo'ng'iroq ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const call = await leaveGroupCall(id, auth.userId);

  return apiSuccess({ call }, { requestId });
});
