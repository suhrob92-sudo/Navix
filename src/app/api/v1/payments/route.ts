import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createPaymentSchema, paymentHistoryQuerySchema } from '@/modules/payment/payment.schemas';
import { createPayment, listPayments } from '@/modules/payment/payment.service';

/**
 * GET  /api/v1/payments — to'lovlar tarixi
 * POST /api/v1/payments — xizmat uchun to'lov qilish
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, paymentHistoryQuerySchema);

  const { payments, total } = await listPayments(auth.userId, query);

  return apiSuccess(
    { payments },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createPaymentSchema);
  const context = getRequestContext(request);

  const payment = await createPayment(auth.userId, input, context);

  return apiSuccess(payment, { requestId, status: 201 });
});
