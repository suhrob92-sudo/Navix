import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { updateMenuItemSchema } from '@/modules/merchant/merchant.schemas';
import { updateMerchantMenuItem } from '@/modules/merchant/merchant.service';

/**
 * PATCH /api/v1/merchant/menu-items/[id] — taomni yangilash.
 *
 * Narx o'zgarishi ESKI buyurtmalarga ta'sir qilmaydi: ular nom va
 * narxning nusxasini saqlaydi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Taom ID noto'g'ri") });

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.MERCHANT_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateMenuItemSchema);

  const item = await updateMerchantMenuItem(auth.userId, id, input);

  return apiSuccess({ item }, { requestId });
});
