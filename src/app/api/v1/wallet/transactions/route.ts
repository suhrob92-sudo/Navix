import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { transactionQuerySchema } from '@/modules/wallet/wallet.schemas';
import { listTransactions } from '@/modules/wallet/wallet.service';

/**
 * GET /api/v1/wallet/transactions — hamyon amallari tarixi.
 *
 * Namuna: /api/v1/wallet/transactions?page=1&pageSize=20&type=TOP_UP
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, transactionQuerySchema);

  const { transactions, total } = await listTransactions(auth.userId, query);

  return apiSuccess(
    { transactions },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
