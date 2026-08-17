import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { respondCollabOfferSchema } from '@/modules/collab/collab.schemas';
import { respondCollabOffer } from '@/modules/collab/collab.service';

/**
 * PATCH /api/v1/collab/offers/[id] — qabul qilish, rad etish yoki
 * qaytarib olish.
 *
 * ── Nima uchun UCHALA amal bitta manzilda ─────────────────────────────
 * Ular bitta narsani o'zgartiradi: taklifning holatini. Kim qaysi
 * amalni qila olishini xizmat tekshiradi — qabul qilish ijodkorning,
 * qaytarib olish esa yuboruvchining ishi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);
  const input = await parseJsonBody(request, respondCollabOfferSchema);

  await enforcePublicRateLimit('postLike', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const offer = await respondCollabOffer(id, auth.userId, input.action);

  return apiSuccess({ offer }, { requestId });
});
