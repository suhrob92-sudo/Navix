import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createAddressSchema } from '@/modules/address/address.schemas';
import { createAddress, listAddresses } from '@/modules/address/address.service';

/**
 * GET  /api/v1/addresses — saqlangan manzillar ro'yxati
 * POST /api/v1/addresses — yangi manzil qo'shish
 *
 * Manzillar umumiy resurs: taksi, ovqat yetkazish va kuryer modullari
 * shu ro'yxatdan foydalanadi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const addresses = await listAddresses(auth.userId);

  return apiSuccess({ addresses }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createAddressSchema);

  const address = await createAddress(auth.userId, input);

  return apiSuccess(address, { requestId, status: 201 });
});
