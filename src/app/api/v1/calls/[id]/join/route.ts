import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { buildIceServers, joinGroupCall } from '@/modules/call/call.service';

/**
 * POST /api/v1/calls/[id]/join — guruh suhbatiga qo'shilish.
 *
 * ── Nima uchun `answer` dan alohida ───────────────────────────────────
 * `answer` bir martalik hodisa: qo'ng'iroq chalinadi, odam ko'taradi.
 * Guruh suhbati esa ochiq xona kabi — odam chiqib, keyin qaytishi
 * mumkin. Bu amal takrorlanadigan.
 *
 * Javobda ulanish serverlari ham qaytadi: qo'shilgan odamga ular
 * DARHOL kerak.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Qo'ng'iroq ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await enforcePublicRateLimit('callStart', auth.userId);

  const call = await joinGroupCall(id, auth.userId);

  return apiSuccess({ call, iceServers: buildIceServers() }, { requestId });
});
