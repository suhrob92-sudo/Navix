import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { openRideChat } from '@/modules/taxi/taxi.service';

/**
 * POST /api/v1/taxi/rides/[id]/chat — safar suhbatini ochadi.
 *
 * ── Nima uchun IKKALA tomon uchun bitta yo'l ──────────────────────────
 * Yo'lovchi ham, haydovchi ham bir xil ishni qiladi: safar bo'yicha
 * suhbatdoshini topib, unga yozadi. Ikkita alohida yo'l ochilsa,
 * ular bir xil mantiqni ikki joyda takrorlardi.
 *
 * Kim so'rayotgani xizmatda aniqlanadi: odam yo yo'lovchi, yo
 * o'sha safarning haydovchisi bo'lishi kerak.
 *
 * ── Nima uchun POST ───────────────────────────────────────────────────
 * So'rov suhbat YARATISHI mumkin — bu o'zgartiruvchi amal. Mavjud
 * bo'lsa o'shanisi qaytariladi, ya'ni takroriy bosish zarar
 * qilmaydi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Safar ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const result = await openRideChat(auth.userId, id);

  return apiSuccess(result, { requestId });
});
