import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getTicket } from '@/modules/travel/travel.service';

/** GET /api/v1/travel/tickets/[id] — bitta chipta (faqat egasiga). */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Chipta ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const ticket = await getTicket(auth.userId, id);

  return apiSuccess({ ticket }, { requestId, headers: { 'cache-control': 'no-store' } });
});
