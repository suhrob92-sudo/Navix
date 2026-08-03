import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { adminAuditQuerySchema } from '@/modules/admin/admin.schemas';
import { listAuditLogs } from '@/modules/admin/admin.service';

/**
 * GET /api/v1/admin/audit — "kim, qachon, nima qildi" jurnali.
 *
 * Namuna: /api/v1/admin/audit?group=MONEY&search=901234567
 *
 * FAQAT O'QISH. Jurnal yozuvlari o'zgarmas: ularni tahrirlash yoki
 * o'chirish imkoni bo'lsa, jurnalning butun ma'nosi yo'qolardi.
 *
 * `PLATFORM_AUDIT_READ` ruxsati qo'llab-quvvatlash xodimida YO'Q —
 * jurnalda boshqa foydalanuvchilarning IP manzillari ham bor.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_AUDIT_READ);
  const query = parseSearchParams(request, adminAuditQuerySchema);

  const { entries, total } = await listAuditLogs(query);

  return apiSuccess(
    { entries },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
