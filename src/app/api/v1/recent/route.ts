import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { MAX_RECENT_VIEWS, RECENT_TARGETS, RECENT_ROW_SIZE } from '@/config/recent';
import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { clearRecentViews, listRecentViews } from '@/modules/recent/recent.service';
import type { RecentResponse } from '@/modules/recent/recent.types';

/**
 * GET  /api/v1/recent — yaqinda ko'rilganlar.
 * DELETE /api/v1/recent — butun tarixni tozalash.
 */
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  /** Faqat bitta tur — bosh sahifadagi qator uchun. */
  target: z.enum(RECENT_TARGETS as [string, ...string[]]).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_RECENT_VIEWS).default(RECENT_ROW_SIZE),
});

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));

  const result = await listRecentViews(auth.userId, {
    target: query.target as (typeof RECENT_TARGETS)[number] | undefined,
    limit: query.limit,
  });

  return apiSuccess<RecentResponse>(result, { requestId });
});

export const DELETE = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const count = await clearRecentViews(auth.userId);

  return apiSuccess({ count }, { requestId });
});
