import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getReferralOverview } from '@/modules/referral/referral.service';
import type { ReferralOverview } from '@/modules/referral/referral.types';

/**
 * GET /api/v1/referral — mening taklif kodim va hisobim.
 *
 * ── Nima uchun faqat O'ZIMNIKI ────────────────────────────────────────
 * Boshqa odamning nechta odam taklif qilgani — uning ishi. Uni
 * ochish "kim eng ko'p odam yig'gan" degan ro'yxat yasash imkonini
 * berardi, buni esa hech kim so'ramagan.
 *
 * So'rovda foydalanuvchi ID si umuman qabul qilinmaydi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const overview = await getReferralOverview(auth.userId);

  return apiSuccess<ReferralOverview>(overview, {
    requestId,
    headers: { 'cache-control': 'no-store' },
  });
});
