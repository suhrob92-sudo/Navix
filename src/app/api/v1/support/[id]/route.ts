import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { replyTicketSchema } from '@/modules/support/support.schemas';
import { getMyTicket, replyAsUser } from '@/modules/support/support.service';

/**
 * GET  /api/v1/support/[id] — murojaat va yozishma
 * POST /api/v1/support/[id] — javob yozish
 *
 * Ikkala amal ham `userId` bilan cheklangan: begona murojaatni
 * ko'rish u yoqda tursin, uning mavjudligini ham bilib bo'lmaydi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Murojaat ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const ticket = await getMyTicket(auth.userId, id);

  return apiSuccess({ ticket }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, replyTicketSchema);

  const ticket = await replyAsUser(auth.userId, id, input);

  return apiSuccess({ ticket }, { requestId });
});
