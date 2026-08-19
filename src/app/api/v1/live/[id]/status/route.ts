import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { liveStatusSchema } from '@/modules/live/live.schemas';
import { setLiveStatus } from '@/modules/live/live.service';

/**
 * PUT /api/v1/live/[id]/status — efirni boshlash, tugatish, bekor qilish.
 *
 * ── Nima uchun ALOHIDA manzil ─────────────────────────────────────────
 * Holat o'zgarishi oddiy tahrirlash emas: u xabar yuboradi va uni
 * orqaga qaytarib bo'lmaydi. Sarlavhani tuzatish bilan bir so'rovga
 * qo'shilsa, tasodifan bosilgan tugma yuzlab odamga xabar yuborib
 * yuborardi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const PUT = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);
  const input = await parseJsonBody(request, liveStatusSchema);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const stream = await setLiveStatus(id, auth.userId, input.status);

  return apiSuccess({ stream }, { requestId });
});
