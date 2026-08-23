import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createGroupInvite, getGroupInvite, revokeGroupInvite } from '@/modules/chat/group-invite.service';

/**
 * GET    /api/v1/chat/groups/[id]/invite — hozirgi havola.
 * POST   /api/v1/chat/groups/[id]/invite — havola yasash yoki yangilash.
 * DELETE /api/v1/chat/groups/[id]/invite — havolani o'chirish.
 *
 * Uchalasi ham a'zo qo'shish huquqini talab qiladi: havola — bu
 * guruhga kirishni ochadigan amal.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Guruh ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const invite = await getGroupInvite(id, auth.userId);

  return apiSuccess({ invite }, { requestId });
});

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await enforcePublicRateLimit('groupManage', auth.userId);

  const invite = await createGroupInvite(id, auth.userId);

  return apiSuccess({ invite }, { requestId, status: 201 });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await enforcePublicRateLimit('groupManage', auth.userId);

  const invite = await revokeGroupInvite(id, auth.userId);

  return apiSuccess({ invite }, { requestId });
});
