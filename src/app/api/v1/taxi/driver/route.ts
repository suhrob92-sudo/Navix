import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { driverOnlineSchema, driverProfileSchema } from '@/modules/taxi/taxi.schemas';
import { getDriverProfile, saveDriverProfile, setDriverOnline } from '@/modules/taxi/taxi.service';

/**
 * GET   /api/v1/taxi/driver — mening haydovchi profilim.
 * PUT   /api/v1/taxi/driver — profilni yaratish yoki yangilash.
 * PATCH /api/v1/taxi/driver — onlayn tugmasi.
 *
 * ── Nima uchun bu yerda TAXI_RIDE_ACCEPT talab qilinmaydi ─────────────
 * Profil to'ldirish — haydovchi bo'lishning BIRINCHI qadami. Ruxsat
 * talab qilinsa, hech kim haydovchi bo'la olmasdi: ruxsat rol bilan
 * beriladi, rol esa profil ochilgandan keyin.
 *
 * Buyurtma OLISH esa allaqachon ruxsat bilan qo'riqlanadi va bu
 * yetarli chegara: profili bor, lekin roli yo'q odam hech qanday
 * safar ololmaydi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const driver = await getDriverProfile(auth.userId);

  return apiSuccess({ driver }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const PUT = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, driverProfileSchema);
  const context = getRequestContext(request);

  const driver = await saveDriverProfile(auth.userId, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ driver }, { requestId });
});

export const PATCH = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, driverOnlineSchema);

  const driver = await setDriverOnline(auth.userId, input);

  return apiSuccess({ driver }, { requestId });
});
