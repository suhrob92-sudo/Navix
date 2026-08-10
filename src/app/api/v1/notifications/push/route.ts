import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { pushSubscribeSchema, pushUnsubscribeSchema } from '@/modules/notification/push.schemas';
import {
  hasSubscription,
  isPushConfigured,
  listSubscriptions,
  pushPublicKey,
  removeSubscription,
  saveSubscription,
} from '@/modules/notification/push.service';
import type { PushStatusResponse } from '@/modules/notification/push.types';

/**
 * Push obunasini boshqarish.
 *
 *   GET    — sozlanganmi, ochiq kalit va qurilmalar ro'yxati
 *   POST   — obuna bo'lish
 *   DELETE — obunani bekor qilish
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  /**
   * Brauzer o'z manzilini yuborishi mumkin.
   *
   * Shunda "aynan shu qurilma obunami" degan savolga aniq javob
   * beramiz — brauzerdagi va serverdagi holat ajralib qolganini
   * shu yo'l bilan aniqlaymiz.
   */
  const endpoint = new URL(request.url).searchParams.get('endpoint');

  const devices = await listSubscriptions(auth.userId);

  const payload: PushStatusResponse = {
    isAvailable: isPushConfigured(),
    publicKey: pushPublicKey(),
    isSubscribed: endpoint ? await hasSubscription(auth.userId, endpoint) : false,
    devices: devices.map((device) => ({
      id: device.id,
      deviceLabel: device.deviceLabel,
      createdAt: device.createdAt.toISOString(),
      lastUsedAt: device.lastUsedAt?.toISOString() ?? null,
    })),
  };

  return apiSuccess(payload, { requestId });
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, pushSubscribeSchema);

  await saveSubscription(auth.userId, input);

  return apiSuccess({ ok: true }, { requestId });
});

export const DELETE = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, pushUnsubscribeSchema);

  await removeSubscription(auth.userId, input.endpoint);

  return apiSuccess({ ok: true }, { requestId });
});
