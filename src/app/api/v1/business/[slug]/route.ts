import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getBusinessProfile } from '@/modules/business/business.service';

/**
 * GET /api/v1/business/[slug] — restoran yoki do'kon profili.
 *
 * Kirish talab qilinadi: javobda "siz obunamisiz?" bor va bu faqat
 * kimligingiz ma'lum bo'lgandagina aniqlanadi.
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

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { slug } = paramsSchema.parse(await params);

  const business = await getBusinessProfile(slug, auth.userId);

  return apiSuccess({ business }, { requestId, headers: { 'cache-control': 'no-store' } });
});
