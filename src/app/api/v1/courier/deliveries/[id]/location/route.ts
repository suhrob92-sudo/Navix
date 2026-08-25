import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { courierLocationSchema } from '@/modules/courier/courier.schemas';
import { reportCourierLocation } from '@/modules/courier/courier.service';

/**
 * POST /api/v1/courier/deliveries/[id]/location — kuryer joylashuvi.
 *
 * ── Nima uchun ALOHIDA endpoint ──────────────────────────────────────
 * Uni holat o'zgartirish (`PATCH .../[id]`) ichiga qo'shish mumkin
 * edi. Lekin bu ikkisining TABIATI butunlay boshqacha:
 *
 *  · holat o'zgarishi — kamdan-kam, muhim, audit jurnaliga tushadi;
 *  · joylashuv — har 20 soniyada, arzon, jurnalga tushmaydi.
 *
 * Ularni bitta yo'lga qo'shish "topshiriqni yakunlash" so'rovini ham
 * shu tezlikda tekshirishga majbur qilardi.
 *
 * ── Nima uchun javob QISQA ───────────────────────────────────────────
 * Kuryerning telefoni bu so'rovni mobil internetda yuboradi. Javobda
 * butun topshiriqni qaytarish har 20 soniyada bir necha kilobayt
 * trafik degani — kuryerning o'z pulidan.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Topshiriq ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.COURIER_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);

  const body: unknown = await request.json();
  const input = courierLocationSchema.parse(body);

  const result = await reportCourierLocation(auth.userId, id, input);

  return apiSuccess(result, { requestId });
});
