import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { advanceRide } from '@/modules/taxi/taxi.service';

/**
 * POST /api/v1/taxi/driver/rides/[id]/step — bosqichni oldinga surish.
 *
 * ── Nima uchun bitta yo'l, ikkita emas ────────────────────────────────
 * "Yetib keldim" va "Boshladim" — bir xil shakldagi amal: holatni
 * keyingisiga o'tkazish. Har biriga alohida yo'l ochilsa, ertaga
 * uchinchi bosqich qo'shilganda yana bitta yo'l kerak bo'lardi.
 *
 * O'tishlar jadvali `taxi.service.ts` da: qaysi holatdan qaysisiga
 * o'tish mumkinligini SERVER hal qiladi, mijoz emas.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Safar ID noto'g'ri") });

const bodySchema = z.object({
  step: z.enum(['ARRIVED', 'START'], { message: "Bosqich noto'g'ri" }),
});

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.TAXI_RIDE_ACCEPT);
  const { id } = paramsSchema.parse(await params);
  const { step } = await parseJsonBody(request, bodySchema);

  const ride = await advanceRide(auth.userId, id, step);

  return apiSuccess({ ride }, { requestId });
});
