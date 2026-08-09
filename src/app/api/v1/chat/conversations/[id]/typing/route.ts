import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { setTyping } from '@/modules/chat/chat.service';

/**
 * POST /api/v1/chat/conversations/[id]/typing — "yozmoqda" belgisi.
 *
 * Belgi Redis'da bir necha soniya yashaydi va o'zi so'nadi — shuning
 * uchun "yozishni to'xtatdim" degan alohida so'rov kerak emas.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Suhbat ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await setTyping(id, auth.userId);

  return apiSuccess({ ok: true }, { requestId });
});
