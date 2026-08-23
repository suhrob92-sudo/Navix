import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { isGroupInviteCode } from '@/config/group-invite';
import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { NotFoundError } from '@/lib/api/errors';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { joinByInvite } from '@/modules/chat/group-invite.service';

/**
 * POST /api/v1/chat/invite/[code]/join — havola orqali guruhga qo'shilish.
 *
 * ── Nima uchun bu yerda KIRISH talab qilinadi ─────────────────────────
 * Ko'rish va qo'shilish — boshqa-boshqa amal. Guruhni ko'rish uchun
 * hisob shart emas, lekin a'zo bo'lish uchun kim ekaningiz ma'lum
 * bo'lishi kerak.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ code: z.string().trim().toUpperCase() });

type Params = { code: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);

  await enforcePublicRateLimit('groupInviteLookup', auth.userId);

  const { code } = paramsSchema.parse(await params);

  if (!isGroupInviteCode(code)) {
    throw new NotFoundError('Havola');
  }

  const result = await joinByInvite(code, auth.userId);

  return apiSuccess(result, { requestId, status: result.isNew ? 201 : 200 });
});
