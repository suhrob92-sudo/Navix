import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { monthKey } from '@/modules/finance/finance.calc';
import { financeQuerySchema } from '@/modules/finance/finance.schemas';
import { getMonthlyFinance } from '@/modules/finance/finance.service';

/**
 * GET /api/v1/finance/summary — oylik moliyaviy hisobot.
 *
 * Hisobot FAQAT so'ragan odamning o'z hamyoni bo'yicha tuziladi:
 * `getOrCreateWallet(userId)` boshqa birovning hamyonini qaytara
 * olmaydi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, financeQuerySchema);

  /* Oy berilmasa — joriy oy, UTC bo'yicha. */
  const month = query.month ?? monthKey(new Date());

  const summary = await getMonthlyFinance(auth.userId, month);

  return apiSuccess({ summary }, { requestId, headers: { 'cache-control': 'no-store' } });
});
