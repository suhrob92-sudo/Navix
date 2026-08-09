import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { followBusiness, unfollowBusiness } from '@/modules/business/business.service';

/**
 * POST   /api/v1/business/[slug]/follow — obuna bo'lish.
 * DELETE /api/v1/business/[slug]/follow — obunani bekor qilish.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Manzil noto'g'ri"),
});

type Params = { slug: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { slug } = paramsSchema.parse(await params);

  await enforcePublicRateLimit('follow', auth.userId, "Juda tez obuna bo'lyapsiz. Biroz kuting.");

  const result = await followBusiness(auth.userId, slug);

  return apiSuccess(result, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { slug } = paramsSchema.parse(await params);

  const result = await unfollowBusiness(auth.userId, slug);

  return apiSuccess(result, { requestId });
});
