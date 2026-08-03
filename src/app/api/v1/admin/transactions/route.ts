import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { adminTransactionQuerySchema } from '@/modules/admin/admin.schemas';
import { listAdminTransactions } from '@/modules/admin/admin.service';

/**
 * GET /api/v1/admin/transactions — barcha hamyon amallari.
 *
 * Namuna: /api/v1/admin/transactions?type=PAYMENT&search=901234567
 *
 * FAQAT O'QISH: tranzaksiyani tahrirlash yoki o'chirish endpointi yo'q
 * va bo'lmaydi ham — buxgalteriya daftari o'zgarmas.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_TRANSACTION_READ);
  const query = parseSearchParams(request, adminTransactionQuerySchema);

  const { transactions, total } = await listAdminTransactions(query);

  return apiSuccess(
    { transactions },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
