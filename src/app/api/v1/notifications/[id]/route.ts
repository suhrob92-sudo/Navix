import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { markAsRead } from '@/modules/notification/notification.service';

/** PATCH /api/v1/notifications/[id] — bitta bildirishnomani o'qilgan deb belgilash. */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.string().uuid("Bildirishnoma ID noto'g'ri") });

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const notification = await markAsRead(auth.userId, id);

  return apiSuccess(notification, { requestId });
});
