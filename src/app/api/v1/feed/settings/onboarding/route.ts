import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { POST_CATEGORY_VALUES } from '@/modules/feed/feed.types';
import { completeFeedOnboarding } from '@/modules/feed/settings.service';
import type { FeedSettingsView } from '@/modules/feed/settings.types';

/**
 * POST /api/v1/feed/settings/onboarding — tanishtiruvni yakunlash.
 *
 * ── Nima uchun PATCH sozlamalaridan alohida ───────────────────────────
 * Bu manzil ikki ishni BIRGA bajaradi: qiziqishlarni saqlaydi va
 * "tanishtirildi" belgisini qo'yadi. Umumiy PATCH orqali qilinsa,
 * belgini brauzer o'zi qo'yishi kerak bo'lardi — ya'ni uni istalgan
 * paytda qaytarib ham olish mumkin bo'lardi.
 */
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  /**
   * Tanlangan bo'limlar. Bo'sh ro'yxat ham to'g'ri javob:
   * "o'tkazib yuborish" aynan shuni anglatadi.
   */
  interests: z
    .array(z.enum(POST_CATEGORY_VALUES))
    .max(POST_CATEGORY_VALUES.length)
    .transform((values) => [...new Set(values)])
    .default([]),
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const { interests } = await parseJsonBody(request, bodySchema);

  const settings = await completeFeedOnboarding(auth.userId, interests);

  return apiSuccess<{ settings: FeedSettingsView }>({ settings }, { requestId });
});
