import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { paginationQuerySchema } from '@/lib/api/pagination';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listNotifications, markAllAsRead } from '@/modules/notification/notification.service';
import { z } from 'zod';

/**
 * GET   /api/v1/notifications — bildirishnomalar ro'yxati (sahifalab)
 * PATCH /api/v1/notifications — barchasini o'qilgan deb belgilash
 */
export const dynamic = 'force-dynamic';

const querySchema = paginationQuerySchema.extend({
  /** `?unreadOnly=true` — faqat o'qilmaganlar. */
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, querySchema);

  const result = await listNotifications(auth.userId, query);

  return apiSuccess(
    { notifications: result.notifications, unreadCount: result.unreadCount },
    { requestId, pagination: result.pagination, headers: { 'cache-control': 'no-store' } },
  );
});

export const PATCH = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const markedCount = await markAllAsRead(auth.userId);

  return apiSuccess({ markedCount }, { requestId });
});
