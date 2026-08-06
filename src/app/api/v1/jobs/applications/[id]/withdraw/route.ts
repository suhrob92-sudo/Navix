import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { withdrawApplication } from '@/modules/job/job.service';

/**
 * POST /api/v1/jobs/applications/[id]/withdraw — arizani qaytarib olish.
 *
 * Yozuv O'CHIRILMAYDI, holati o'zgaradi. Shunda "bitta e'longa bitta
 * ariza" cheklovi kuchda qoladi va nomzod qaytarib olib, keyin
 * qayta-qayta yuborib ish beruvchini bezovta qila olmaydi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Ariza ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const application = await withdrawApplication(auth.userId, id);

  return apiSuccess({ application }, { requestId });
});
