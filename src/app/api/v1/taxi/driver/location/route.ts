import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { driverLocationSchema } from '@/modules/taxi/taxi.schemas';
import { reportDriverLocation } from '@/modules/taxi/taxi.service';

/**
 * POST /api/v1/taxi/driver/location — joylashuvni yuborish.
 *
 * ── Nima uchun juda noaniq nuqta XATO emas ────────────────────────────
 * Telefon binoda GPS ni yo'qotib, 2 km xatolik bilan nuqta berishi
 * mumkin. Bunga xato qaytarilsa, haydovchining ekranida qizil
 * ogohlantirish chiqib turardi — holbuki u hech narsa qilmagan.
 *
 * Shuning uchun javob 200 va ichida `accepted: false`: nuqta
 * yozilmadi, lekin bu muammo emas.
 */
export const dynamic = 'force-dynamic';

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, driverLocationSchema);

  const result = await reportDriverLocation(auth.userId, input);

  return apiSuccess(result, { requestId });
});
