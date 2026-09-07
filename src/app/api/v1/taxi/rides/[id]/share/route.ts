import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { siteConfig } from '@/config/site';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createRideShare } from '@/modules/taxi/taxi.service';

/**
 * POST /api/v1/taxi/rides/[id]/share — kuzatish havolasini beradi.
 *
 * Faqat YO'LOVCHI ulasha oladi: safar uning safari va uni kim
 * kuzatishini u hal qiladi. Haydovchi uchun bunday tugma yo'q.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Safar ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const { token } = await createRideShare(auth.userId, id);

  /*
    To'liq havola SERVERDA yasaladi: brauzerdagi manzil boshqa
    bo'lishi mumkin (masalan ilova ichidagi ko'rinish) va o'shanda
    ulashilgan havola ishlamasdi.
  */
  return apiSuccess({ url: `${siteConfig.url}/safar/${token}` }, { requestId });
});
