import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { deleteSavedAccount } from '@/modules/payment/payment.service';

/** DELETE /api/v1/payments/accounts/[id] — saqlangan hisobni o'chirish. */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.string().uuid("Hisob ID noto'g'ri") });

type Params = { id: string };

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await deleteSavedAccount(auth.userId, id);

  return apiSuccess({ deleted: true }, { requestId });
});
