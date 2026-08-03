import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createSavedAccountSchema } from '@/modules/payment/payment.schemas';
import { createSavedAccount, listSavedAccounts } from '@/modules/payment/payment.service';

/**
 * GET  /api/v1/payments/accounts — saqlangan hisoblar
 * POST /api/v1/payments/accounts — yangi hisob saqlash
 *
 * Kommunal to'lov har oy takrorlanadi. Saqlangan hisob bilan raqamni
 * qayta kiritish shart emas.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const accounts = await listSavedAccounts(auth.userId);

  return apiSuccess({ accounts }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createSavedAccountSchema);

  const account = await createSavedAccount(auth.userId, input);

  return apiSuccess(account, { requestId, status: 201 });
});
