import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { creatorsQuerySchema } from '@/modules/collab/collab.schemas';
import { listCreators } from '@/modules/collab/collab.service';
import type { CreatorsResponse } from '@/modules/collab/collab.types';

/**
 * GET /api/v1/creators — hamkorlikka OCHIQ ijodkorlar katalogi.
 *
 * ── Nima uchun alohida manzil, umumiy qidiruv emas ────────────────────
 * Umumiy odam qidiruvi hamma foydalanuvchini qaytaradi va biznes
 * ular orasidan hamkorlikka ochiqlarini ajrata olmasdi.
 *
 * Bu yerda esa savol aniq: "kimga taklif yozsam bo'ladi?".
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, creatorsQuerySchema);

  await enforcePublicRateLimit('userSearch', auth.userId, "Juda ko'p qidiruv. Biroz kuting.");

  const creators = await listCreators(auth.userId, query);

  return apiSuccess<CreatorsResponse>({ creators }, {
    requestId,
    headers: { 'cache-control': 'no-store' },
  });
});
