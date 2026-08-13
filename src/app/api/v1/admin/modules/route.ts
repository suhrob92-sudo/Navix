import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { listModuleSwitches } from '@/modules/admin/module-switch.service';

/**
 * GET /api/v1/admin/modules — yopish mumkin bo'lgan bo'limlar va holati.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_MODULE_MANAGE);

  const modules = await listModuleSwitches();

  return apiSuccess({ modules }, { requestId, headers: { 'cache-control': 'no-store' } });
});
