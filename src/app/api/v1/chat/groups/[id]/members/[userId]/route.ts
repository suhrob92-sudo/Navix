import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { setMemberAdminSchema } from '@/modules/chat/group.schemas';
import { removeMember, setMemberAdmin } from '@/modules/chat/group.service';

/**
 * PATCH  /api/v1/chat/groups/[id]/members/[userId] — administratorlik.
 * DELETE /api/v1/chat/groups/[id]/members/[userId] — guruhdan chiqarish.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.uuid("Guruh ID noto'g'ri"),
  userId: z.uuid("Foydalanuvchi ID noto'g'ri"),
});

type Params = { id: string; userId: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id, userId } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, setMemberAdminSchema);

  await enforcePublicRateLimit('groupManage', auth.userId);

  const group = await setMemberAdmin(id, auth.userId, userId, input.isAdmin);

  return apiSuccess({ group }, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id, userId } = paramsSchema.parse(await params);

  await enforcePublicRateLimit('groupManage', auth.userId);

  const group = await removeMember(id, auth.userId, userId);

  return apiSuccess({ group }, { requestId });
});
