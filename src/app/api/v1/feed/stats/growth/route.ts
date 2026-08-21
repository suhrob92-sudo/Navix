import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { growthQuerySchema } from '@/modules/feed/feed.schemas';
import { getCreatorGrowth } from '@/modules/feed/growth.service';
import type { CreatorGrowth } from '@/modules/feed/growth.types';

/**
 * GET /api/v1/feed/stats/growth — MENING o'sishim.
 *
 * ── Nima uchun faqat o'zimniki ────────────────────────────────────────
 * Boshqa odamning obunachi dinamikasi — tijorat ma'lumoti. Uni
 * ochish raqobatchiga "qachon o'sish boshlandi, qaysi post ishladi"
 * degan savolga javob berardi.
 *
 * Shuning uchun so'rovda foydalanuvchi ID si umuman qabul
 * qilinmaydi: javob har doim so'rayotgan odamniki.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, growthQuerySchema);

  const growth = await getCreatorGrowth(auth.userId, query.days);

  return apiSuccess<CreatorGrowth>(growth, {
    requestId,
    headers: { 'cache-control': 'no-store' },
  });
});
