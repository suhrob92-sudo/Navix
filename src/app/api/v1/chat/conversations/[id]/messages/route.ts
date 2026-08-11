import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { sendMessageSchema } from '@/modules/chat/chat.schemas';
import { sendMessage } from '@/modules/chat/chat.service';

/**
 * POST /api/v1/chat/conversations/[id]/messages — xabar yuborish.
 *
 * Cheklov: bitta odam daqiqasiga 60 ta xabar. Odam uchun bemalol
 * (soniyasiga bitta), skript uchun esa spam qilishga yetmaydi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Suhbat ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, sendMessageSchema);

  await enforcePublicRateLimit('chatSend', auth.userId, 'Juda tez yozyapsiz. Biroz sekinlashtiring.');

  const message = await sendMessage(id, auth.userId, input.body, input.imageUrl ?? null);

  return apiSuccess({ message }, { requestId, status: 201 });
});
