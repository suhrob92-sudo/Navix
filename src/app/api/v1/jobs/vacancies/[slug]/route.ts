import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { optionalAuth } from '@/modules/auth/auth.guard';
import { getVacancy } from '@/modules/job/job.service';

/** GET /api/v1/jobs/vacancies/[slug] — bitta vakansiya. */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ slug: z.string().trim().min(1).max(90) });

type Params = { slug: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await optionalAuth(request);
  const { slug } = paramsSchema.parse(await params);

  const data = await getVacancy(slug, auth?.userId ?? null);

  return apiSuccess(data, { requestId });
});
