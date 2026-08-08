import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { DELIVERY_REGIONS } from '@/config/delivery';
import { requireAuth } from '@/modules/auth/auth.guard';
import { parcelQuoteSchema } from '@/modules/parcel/parcel.schemas';
import { quoteParcel } from '@/modules/parcel/parcel.service';

/**
 * GET /api/v1/parcels/quote — narxni oldindan hisoblash.
 *
 * ── Nima uchun alohida endpoint ───────────────────────────────────────
 * Foydalanuvchi jo'natishdan OLDIN narxni bilishi kerak. Narxni
 * brauzerda hisoblash mumkin edi, lekin unda tarif IKKI joyda
 * yashardi va ertaga ular bir-biridan ajralib qolardi.
 *
 * Hech narsa saqlanmaydi — bu faqat hisob-kitob.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requireAuth(request);
  const query = parseSearchParams(request, parcelQuoteSchema);

  const quote = quoteParcel(query);

  return apiSuccess({ quote, regions: DELIVERY_REGIONS }, { requestId });
});
