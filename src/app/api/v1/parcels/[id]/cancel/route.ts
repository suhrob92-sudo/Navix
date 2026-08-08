import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { cancelParcelSchema } from '@/modules/parcel/parcel.schemas';
import { cancelParcel } from '@/modules/parcel/parcel.service';

/**
 * POST /api/v1/parcels/[id]/cancel — bekor qilish va pulni qaytarish.
 *
 * ── Nima uchun POST, DELETE emas ──────────────────────────────────────
 * Jo'natma O'CHIRILMAYDI: yozuv va pul harakati tarixda qoladi.
 * `DELETE` esa "yo'q qilindi" degan ma'no berardi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Jo'natma ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  // Tana har doim yuboriladi (hech bo'lmasa `{}`) — sabab yozish ixtiyoriy.
  const input = await parseJsonBody(request, cancelParcelSchema);
  const context = getRequestContext(request);

  const parcel = await cancelParcel(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ parcel }, { requestId });
});
