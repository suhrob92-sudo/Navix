import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { resetRecommendations } from '@/modules/feed/settings.service';
import type { FeedSettingsView } from '@/modules/feed/settings.types';

/**
 * POST /api/v1/feed/settings/reset — tavsiyalarni noldan boshlash.
 *
 * ── Nima uchun chegara qo'yilgan ──────────────────────────────────────
 * Bu amal qaytarib bo'lmaydi: tanlangan qiziqishlar o'chadi. Uni
 * ketma-ket bosish hech qanday foyda bermaydi, lekin bazani
 * bekorga yozdiradi.
 */
export const dynamic = 'force-dynamic';

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  await enforcePublicRateLimit('upload', auth.userId, "Juda tez-tez tiklayapsiz. Biroz kuting.");

  const settings = await resetRecommendations(auth.userId);

  return apiSuccess<{ settings: FeedSettingsView }>({ settings }, { requestId });
});
