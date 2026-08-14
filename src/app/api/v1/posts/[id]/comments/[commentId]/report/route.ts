import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { reportUserSchema } from '@/modules/moderation/moderation.schemas';
import { reportComment } from '@/modules/moderation/moderation.service';

/**
 * POST /api/v1/posts/[id]/comments/[commentId]/report — izoh ustidan
 * shikoyat.
 *
 * Post ID manzilda bor, lekin tekshiruvda ishlatilmaydi: izohning
 * o'zi qaysi postga tegishli ekanini biladi. Manzilda turishining
 * sababi — havola tuzilishi izohlar manzili bilan bir xil bo'lishi
 * kerak.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string; commentId: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { commentId } = await params;
  const input = await parseJsonBody(request, reportUserSchema);

  await enforcePublicRateLimit('report', auth.userId, "Juda ko'p shikoyat yubordingiz. Biroz kuting.");

  await reportComment(auth.userId, parseIdParam(commentId), input);

  return apiSuccess({ isReported: true }, { requestId, status: 201 });
});
