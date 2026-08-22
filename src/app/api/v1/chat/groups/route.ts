import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createGroupSchema } from '@/modules/chat/group.schemas';
import { createGroup } from '@/modules/chat/group.service';

/**
 * POST /api/v1/chat/groups — guruh yaratish.
 *
 * Javobda faqat suhbat ID'si qaytadi: brauzer darhol o'sha suhbatga
 * o'tadi va to'liq ma'lumotni odatdagi yo'l bilan oladi.
 */
export const dynamic = 'force-dynamic';

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createGroupSchema);

  await enforcePublicRateLimit(
    'groupCreate',
    auth.userId,
    "Juda ko'p guruh yaratdingiz. Birozdan keyin urinib ko'ring.",
  );

  const conversationId = await createGroup(auth.userId, input);

  return apiSuccess({ conversationId }, { requestId, status: 201 });
});
