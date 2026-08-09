import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { endCallSchema } from '@/modules/call/call.schemas';
import { endCall } from '@/modules/call/call.service';

/**
 * POST /api/v1/calls/[id]/end — qo'ng'iroqni tugatish.
 *
 * Bitta yo'l uch holatni qamraydi: rad etish, bekor qilish va suhbatni
 * tugatish. Brauzer uchun ham shunday soddaroq — u har doim bitta
 * "tugatish" tugmasini biladi, qolganini server hal qiladi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Qo'ng'iroq ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, endCallSchema);

  const call = await endCall(id, auth.userId, { failed: input.failed });

  return apiSuccess({ call }, { requestId });
});
