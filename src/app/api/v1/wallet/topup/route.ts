import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { topUpSchema } from '@/modules/wallet/wallet.schemas';
import { topUp } from '@/modules/wallet/wallet.service';

/**
 * POST /api/v1/wallet/topup — hamyonni to'ldirish.
 *
 * So'rovda `idempotencyKey` majburiy: aloqa uzilib qayta yuborilganda
 * pul ikki marta qo'shilib qolmasligi kerak.
 */
export const dynamic = 'force-dynamic';

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  /*
    Pul amali — soatiga yigirmata.

    `idempotencyKey` aloqa uzilganda takrorlanishdan saqlaydi, lekin
    ataylab yuborilgan yuzlab so'rovni to'xtatmaydi. Izohi
    `lib/rate-limit.ts` da.
  */
  await enforcePublicRateLimit('moneyAction', auth.userId);
  const input = await parseJsonBody(request, topUpSchema);
  const context = getRequestContext(request);

  const transaction = await topUp(auth.userId, input, context);

  return apiSuccess(transaction, { requestId, status: 201 });
});
