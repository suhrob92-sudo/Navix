import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { optionalAuth } from '@/modules/auth/auth.guard';
import { getProductFacets, type ProductFacets } from '@/modules/market/facet.service';
import { productQuerySchema } from '@/modules/market/market.schemas';

/**
 * GET /api/v1/market/facets — filtr oynasi uchun yordamchi ma'lumot.
 *
 * ── Nima uchun mahsulotlar bilan BIRGA qaytmaydi ──────────────────────
 * Fasetlar har bir sahifada emas, faqat filtr OYNASI ochilganda
 * kerak. Ularni har bir ro'yxat so'roviga qo'shsak, katalogni
 * varaqlagan odam uchun uchta ortiqcha hisob-kitob har safar
 * bajarilardi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await optionalAuth(request);

  await enforcePublicRateLimit(
    'publicCatalog',
    auth?.userId ?? 'guest',
    "Juda ko'p so'rov yuborilyapti. Biroz kuting.",
  );

  const query = productQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));

  const facets = await getProductFacets(query);

  return apiSuccess<ProductFacets>(facets, { requestId });
});
