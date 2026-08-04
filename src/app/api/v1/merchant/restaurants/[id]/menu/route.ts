import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { listMerchantMenu } from '@/modules/merchant/merchant.service';

/** GET /api/v1/merchant/restaurants/[id]/menu — restoran menyusi. */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Restoran ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.MERCHANT_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);

  const items = await listMerchantMenu(auth.userId, id);

  return apiSuccess({ items }, { requestId, headers: { 'cache-control': 'no-store' } });
});
