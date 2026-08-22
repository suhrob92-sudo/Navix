import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { updateGroupSchema } from '@/modules/chat/group.schemas';
import { getGroupInfo, updateGroup } from '@/modules/chat/group.service';

/**
 * GET   /api/v1/chat/groups/[id] — guruh ma'lumoti va a'zolar.
 * PATCH /api/v1/chat/groups/[id] — nom va rasmni o'zgartirish.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Guruh ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const group = await getGroupInfo(id, auth.userId);

  return apiSuccess({ group }, { requestId });
});

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateGroupSchema);

  await enforcePublicRateLimit('groupManage', auth.userId);

  const group = await updateGroup(id, auth.userId, input);

  return apiSuccess({ group }, { requestId });
});
