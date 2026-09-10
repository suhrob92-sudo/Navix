import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { siteConfig } from '@/config/site';
import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createParcelTrack } from '@/modules/parcel/parcel.service';

/**
 * POST /api/v1/parcels/[id]/track — kuzatish havolasini beradi.
 *
 * Faqat JO'NATUVCHI ulasha oladi: posilka uniki va uni kim
 * kuzatishini u hal qiladi. Kuryer uchun bunday tugma yo'q.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Jo'natma ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const { token } = await createParcelTrack(auth.userId, id);

  /*
    To'liq havola SERVERDA yasaladi: brauzerdagi manzil boshqa
    bo'lishi mumkin (masalan ilova ichidagi ko'rinish) va o'shanda
    ulashilgan havola ishlamasdi.
  */
  return apiSuccess({ url: `${siteConfig.url}/posilka/${token}` }, { requestId });
});
