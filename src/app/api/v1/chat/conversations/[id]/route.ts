import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getThread } from '@/modules/chat/chat.service';

/** GET /api/v1/chat/conversations/[id] — suhbat va xabarlar. */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Suhbat ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const thread = await getThread(id, auth.userId);

  return apiSuccess({ thread }, { requestId, headers: { 'cache-control': 'no-store' } });
});
