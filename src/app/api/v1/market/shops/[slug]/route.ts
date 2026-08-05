import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getShop } from '@/modules/market/market.service';

/** GET /api/v1/market/shops/[slug] — do'kon va uning mahsulotlari. */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Manzil noto'g'ri"),
});

type Params = { slug: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  await requireAuth(request);
  const { slug } = paramsSchema.parse(await params);

  const result = await getShop(slug);

  return apiSuccess(result, { requestId });
});
