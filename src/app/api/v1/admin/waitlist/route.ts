import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { adminWaitlistQuerySchema } from '@/modules/admin/admin.schemas';
import { listWaitlist } from '@/modules/admin/waitlist.service';

/**
 * GET /api/v1/admin/waitlist — navbatga yozilganlar.
 *
 * Ro'yxatda hali ro'yxatdan o'tmagan odamlarning telefon raqamlari
 * bor, shuning uchun alohida ruxsat talab qilinadi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_WAITLIST_READ);

  const query = parseSearchParams(request, adminWaitlistQuerySchema);
  const { entries, total, bySource } = await listWaitlist(query);

  return apiSuccess(
    { entries, bySource },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});
