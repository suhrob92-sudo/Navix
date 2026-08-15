import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { loadDiscover, searchFeed } from '@/modules/feed/discover.service';
import { feedSearchQuerySchema } from '@/modules/feed/feed.schemas';
import type { FeedSearchResult } from '@/modules/feed/discover.types';

/**
 * GET /api/v1/feed/discover — Feed qidiruv sahifasi.
 *
 * `q` berilmasa — kashf qilish holati (mashhur mavzular, tavsiya
 * etilgan ijodkorlar, mashhur videolar).
 * `q` berilsa — qidiruv natijasi.
 *
 * ── Nima uchun BITTA manzil ───────────────────────────────────────────
 * Ekran ikkala holatda ham bir xil ko'rinadi: uchta ro'yxat. Ikkita
 * alohida manzil qilsak, brauzer tomonda "qaysi birini so'ray?"
 * degan shart paydo bo'lardi va ikkala javob turini moslashtirib
 * yurishga to'g'ri kelardi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  /**
   * Chegara qidiruv uchun ham qo'yiladi.
   *
   * Bu manzil bir necha jadvalni birdan o'qiydi — uni tinimsiz
   * chaqirish bazani ortiqcha yuklaydi.
   */
  await enforcePublicRateLimit('userSearch', auth.userId);

  const { q, scope } = parseSearchParams(request, feedSearchQuerySchema);

  const result: FeedSearchResult = q ? await searchFeed(auth.userId, q, scope) : await loadDiscover(auth.userId);

  return apiSuccess(result, { requestId, headers: { 'cache-control': 'no-store' } });
});
