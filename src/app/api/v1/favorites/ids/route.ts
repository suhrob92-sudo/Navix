import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listFavoriteIds } from '@/modules/favorite/favorite.service';
import type { FavoriteIdsResponse } from '@/modules/favorite/favorite.types';

/**
 * GET /api/v1/favorites/ids — saqlangan narsalarning ID'lari.
 *
 * ── Nima uchun bu ALOHIDA manzil ──────────────────────────────────────
 * Katalogda 40 ta mahsulot bor. Har biriga "bu sevimlimi?" degan
 * so'rov yuborilsa, 40 ta so'rov ketardi va sahifa sekinlashardi.
 *
 * Bu so'rov esa BITTA va u faqat ID'larni qaytaradi — nom ham,
 * rasm ham emas. Barcha yurakchalar shu ro'yxatdan bo'yaladi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const ids = await listFavoriteIds(auth.userId);

  return apiSuccess<FavoriteIdsResponse>({ ids }, { requestId });
});
