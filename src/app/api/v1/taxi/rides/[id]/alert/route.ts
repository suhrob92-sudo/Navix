import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { raiseRideAlert } from '@/modules/taxi/taxi.service';

/**
 * POST /api/v1/taxi/rides/[id]/alert — SOS.
 *
 * ── Nima uchun IKKALA tomon uchun ochiq ───────────────────────────────
 * Xavf ostida yo'lovchi ham, haydovchi ham qolishi mumkin. Faqat
 * yo'lovchiga ruxsat bersak, tunda uzoq mahallaga borgan haydovchi
 * yordam so'ray olmasdi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Safar ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  const context = getRequestContext(request);

  const result = await raiseRideAlert(auth.userId, id, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess(result, { requestId, status: 201 });
});
