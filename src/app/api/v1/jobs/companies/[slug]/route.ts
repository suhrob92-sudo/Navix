import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
import { apiSuccess } from '@/lib/api/response';
import { optionalAuth } from '@/modules/auth/auth.guard';
import { getCompany } from '@/modules/job/job.service';

/**
 * GET /api/v1/jobs/companies/[slug] — kompaniya va uning e'lonlari.
 *
 * Kirish SHART EMAS: kompaniya haqida o'qish uchun ro'yxatdan
 * o'tish talab qilinsa, odam shunchaki orqaga qaytardi. Kirgan
 * foydalanuvchi qo'shimcha "ariza yuborilgan" belgisini ko'radi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ slug: z.string().trim().min(1).max(60) });

type Params = { slug: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  /* Ochiq manzil — chegara MANZIL bo'yicha. Sababi `lib/rate-limit.ts` da. */
  await enforcePublicRateLimit('publicCatalog', getRequestContext(request).ipAddress ?? 'anonim');

  const auth = await optionalAuth(request);
  const { slug } = paramsSchema.parse(await params);

  const data = await getCompany(slug, auth?.userId ?? null);

  return apiSuccess(data, { requestId });
});
