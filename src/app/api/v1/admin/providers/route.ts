import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { adminProviderQuerySchema, createProviderSchema } from '@/modules/admin/admin.schemas';
import { createAdminProvider, listAdminProviders } from '@/modules/admin/admin.service';

/**
 * GET  /api/v1/admin/providers — barcha xizmatlar (o'chirilganlari bilan)
 * POST /api/v1/admin/providers — yangi xizmat qo'shish
 *
 * Ikki xil ruxsat: ko'rish uchun admin panelga kirish yetarli, lekin
 * QO'SHISH uchun alohida ruxsat kerak — qo'llab-quvvatlash xodimi
 * provayder yarata olmasligi kerak.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_ADMIN_ACCESS);
  const query = parseSearchParams(request, adminProviderQuerySchema);

  const providers = await listAdminProviders(query);

  return apiSuccess({ providers }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.PLATFORM_PROVIDER_MANAGE);
  const input = await parseJsonBody(request, createProviderSchema);
  const context = getRequestContext(request);

  const provider = await createAdminProvider(auth.userId, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
  });

  return apiSuccess({ provider }, { requestId, status: 201 });
});
