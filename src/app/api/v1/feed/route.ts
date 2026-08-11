import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { feedQuerySchema } from '@/modules/feed/feed.schemas';
import { listFeed } from '@/modules/feed/feed.service';

/**
 * GET /api/v1/feed — lenta.
 *
 * Namuna: /api/v1/feed?tab=LATEST&cursor=2026-08-11T02:10:00.000Z_9f0e…
 *
 * ── Nima uchun `pagination` EMAS, `nextCursor` ────────────────────────
 * Lentaga doim yangi post qo'shiladi. Sahifa raqami bilan o'qilganda
 * ikkinchi sahifada birinchisining oxirgi posti qayta ko'rinardi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, feedQuerySchema);

  const result = await listFeed(auth.userId, query);

  return apiSuccess(result, { requestId, headers: { 'cache-control': 'no-store' } });
});
