import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { feedSettingsSchema } from '@/modules/feed/settings.schemas';
import { getFeedSettings, updateFeedSettings } from '@/modules/feed/settings.service';
import type { FeedSettingsView } from '@/modules/feed/settings.types';

/**
 * GET  /api/v1/feed/settings — sozlamalarni o'qish.
 * PATCH /api/v1/feed/settings — bitta yoki bir nechta sozlamani o'zgartirish.
 *
 * ── Nima uchun PATCH, PUT emas ────────────────────────────────────────
 * Ekranda bitta tugma bosiladi. PUT butun holatni talab qilardi va
 * ikkita ekran bir vaqtda ochiq bo'lsa, biri ikkinchisining
 * o'zgarishini bekor qilib yuborardi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const settings = await getFeedSettings(auth.userId);

  return apiSuccess<{ settings: FeedSettingsView }>(
    { settings },
    { requestId, headers: { 'cache-control': 'no-store' } },
  );
});

export const PATCH = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const input = await parseJsonBody(request, feedSettingsSchema);

  const settings = await updateFeedSettings(auth.userId, input);

  return apiSuccess<{ settings: FeedSettingsView }>({ settings }, { requestId });
});
