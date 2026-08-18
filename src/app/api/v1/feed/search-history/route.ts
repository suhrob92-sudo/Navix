import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { searchHistoryQuerySchema } from '@/modules/feed/feed.schemas';
import { clearSearchHistory, listSearchHistory } from '@/modules/feed/search-history.service';

/**
 * GET    /api/v1/feed/search-history — oxirgi qidiruvlar.
 * DELETE /api/v1/feed/search-history — tarixni tozalash.
 *
 * `?q=` berilsa, DELETE faqat O'SHA yozuvni o'chiradi. Berilmasa —
 * hammasini.
 *
 * ── Nima uchun bittalab o'chirish ham bor ─────────────────────────────
 * Tarixda tasodifiy yoki shaxsiy so'z qolib ketishi mumkin. Butun
 * tarixni o'chirishga majburlash — qolgan barcha qulaylikni yo'q
 * qilish degani.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const queries = await listSearchHistory(auth.userId);

  return apiSuccess({ queries }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const DELETE = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const { q } = parseSearchParams(request, searchHistoryQuerySchema);

  await clearSearchHistory(auth.userId, q);

  const queries = await listSearchHistory(auth.userId);

  return apiSuccess({ queries }, { requestId });
});
