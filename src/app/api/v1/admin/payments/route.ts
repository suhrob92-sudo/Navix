import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { adminPaymentQuerySchema } from '@/modules/admin/admin.schemas';
import { listAdminPayments } from '@/modules/admin/admin.service';

/**
 * GET /api/v1/admin/payments — barcha xizmat to'lovlari.
 *
 * Namuna: /api/v1/admin/payments?status=COMPLETED&search=NVX-20260803
 *
 * Qidiruv chek raqami, hisob raqami va mijoz telefoni bo'yicha ishlaydi —
 * murojaat kelganda xodim shulardan birini biladi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_TRANSACTION_READ);
  const query = parseSearchParams(request, adminPaymentQuerySchema);

  const { payments, total } = await listAdminPayments(query);

  return apiSuccess(
    { payments },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
