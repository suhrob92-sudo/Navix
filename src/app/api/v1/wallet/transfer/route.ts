import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { phoneSchema } from '@/modules/auth/auth.schemas';
import { transferSchema } from '@/modules/wallet/wallet.schemas';
import { lookupTransferRecipient, transfer } from '@/modules/wallet/wallet.service';
import { z } from 'zod';

/**
 * GET  /api/v1/wallet/transfer?phone=... — qabul qiluvchini tekshirish
 * POST /api/v1/wallet/transfer          — pul o'tkazish
 *
 * Nima uchun GET ham bor: foydalanuvchi "Kimga?" degan savolga javobni
 * pul yuborishdan OLDIN ko'rishi kerak. Bitta xato raqam — begonaga
 * ketgan pul degani.
 */
export const dynamic = 'force-dynamic';

const lookupQuerySchema = z.object({ phone: phoneSchema });

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const { phone } = parseSearchParams(request, lookupQuerySchema);

  const recipient = await lookupTransferRecipient(auth.userId, phone);

  return apiSuccess(recipient, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, transferSchema);
  const context = getRequestContext(request);

  const transaction = await transfer(auth.userId, input, context);

  return apiSuccess(transaction, { requestId, status: 201 });
});
