import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getWalletSummary } from '@/modules/wallet/wallet.service';

/**
 * GET /api/v1/wallet — hamyon holati va oxirgi amallar.
 *
 * Bosh sahifadagi balans kartasi va hamyon sahifasi shu endpointdan
 * foydalanadi, shuning uchun oxirgi 5 ta amal ham birga qaytariladi —
 * ikkinchi so'rov qilishning hojati qolmaydi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const wallet = await getWalletSummary(auth.userId);

  return apiSuccess(wallet, { requestId, headers: { 'cache-control': 'no-store' } });
});
