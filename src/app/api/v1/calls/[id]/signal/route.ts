import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { callSignalSchema } from '@/modules/call/call.schemas';
import { relaySignal } from '@/modules/call/call.service';

/**
 * POST /api/v1/calls/[id]/signal — ulanish ma'lumotini uzatish.
 *
 * Server bu ma'lumotning mazmuniga aralashmaydi: u ikki brauzer
 * o'rtasidagi texnik yozishma. Server faqat "kimga" ekanini biladi va
 * uni navbatga qo'yadi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Qo'ng'iroq ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);

  await enforcePublicRateLimit('callSignal', auth.userId);

  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, callSignalSchema);

  await relaySignal(id, auth.userId, input);

  return apiSuccess({ ok: true }, { requestId });
});
