import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { getEmployerOverview } from '@/modules/employer/employer.service';

/**
 * GET /api/v1/employer/companies — mening kompaniyalarim.
 *
 * Kompaniya ID'si so'rovda YO'Q: ro'yxat tokendagi foydalanuvchiga
 * tegishlilaridan yig'iladi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.EMPLOYER_DASHBOARD_ACCESS);

  const { companies, stats } = await getEmployerOverview(auth.userId);

  return apiSuccess({ companies, stats }, { requestId, headers: { 'cache-control': 'no-store' } });
});
