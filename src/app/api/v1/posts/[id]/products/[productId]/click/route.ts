import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { markProductClicked } from '@/modules/feed/feed.service';

/**
 * POST /api/v1/posts/[id]/products/[productId]/click — mahsulot tugmasi bosildi.
 *
 * ── Nima uchun bu son AYRIM saqlanadi ─────────────────────────────────
 * Ko'rish — "video ekranda o'ynadi". Bosish — "odam mahsulotni ochdi".
 * Sotuvchi shu ikki sonni taqqoslab, videosi sotuvga ishlayaptimi
 * yoki shunchaki tomosha bo'lyaptimi — bilib oladi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string; productId: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const resolved = await params;
  const postId = parseIdParam(resolved.id);
  const productId = parseIdParam(resolved.productId);

  await enforcePublicRateLimit('postShare', auth.userId, "Juda ko'p so'rov. Biroz kuting.");

  await markProductClicked(postId, productId, auth.userId);

  return apiSuccess({ counted: true }, { requestId });
});
