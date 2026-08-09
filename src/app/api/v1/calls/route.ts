import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { startCallSchema } from '@/modules/call/call.schemas';
import { buildIceServers, startCall } from '@/modules/call/call.service';

/**
 * POST /api/v1/calls — qo'ng'iroqni boshlash.
 *
 * Javobda ulanish serverlari ham qaytariladi: brauzerga ular DARHOL
 * kerak bo'ladi va alohida so'rov qo'ng'iroqni sekinlashtirardi.
 */
export const dynamic = 'force-dynamic';

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  await enforcePublicRateLimit('callStart', auth.userId);

  const input = await parseJsonBody(request, startCallSchema);

  const call = await startCall(auth.userId, input);

  return apiSuccess({ call, iceServers: buildIceServers() }, { requestId });
});
