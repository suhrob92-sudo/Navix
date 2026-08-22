import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { addMembersSchema } from '@/modules/chat/group.schemas';
import { addMembers } from '@/modules/chat/group.service';

/** POST /api/v1/chat/groups/[id]/members — guruhga a'zo qo'shish. */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Guruh ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, addMembersSchema);

  await enforcePublicRateLimit('groupManage', auth.userId);

  const result = await addMembers(id, auth.userId, input);

  return apiSuccess(result, { requestId });
});
