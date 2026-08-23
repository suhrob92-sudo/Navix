import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { removeQuestion } from '@/modules/product/product-qa.service';

/** DELETE /api/v1/questions/[id] — o'z savolini o'chirish. */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Savol ID noto'g'ri") });

type Params = { id: string };

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await enforcePublicRateLimit('productQuestion', auth.userId, 'Juda tez-tez amal qilyapsiz.');

  await removeQuestion(id, auth.userId);

  return apiSuccess({ ok: true }, { requestId });
});
