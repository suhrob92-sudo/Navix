import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { markRead } from '@/modules/chat/chat.service';

/** POST /api/v1/chat/conversations/[id]/read — suhbatni o'qilgan deb belgilash. */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Suhbat ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await markRead(id, auth.userId);

  return apiSuccess({ ok: true }, { requestId });
});
