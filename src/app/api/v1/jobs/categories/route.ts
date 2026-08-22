import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
import { apiSuccess } from '@/lib/api/response';
import { listJobCategories } from '@/modules/job/job.service';

/**
 * GET /api/v1/jobs/categories — kasb yo'nalishlari.
 *
 * Kirish TALAB QILINMAYDI: ish qidirayotgan odam avval e'lonlarni
 * ko'rib, keyin ro'yxatdan o'tishi tabiiy. Ariza yuborish esa
 * albatta kirishni talab qiladi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  /**
   * Ochiq manzil — chegara MANZIL bo'yicha.
   *
   * Sababi `lib/rate-limit.ts` dagi `publicCatalog` izohida: chegarasiz
   * ochiq katalogni skript bilan butunlay ko'chirib olish mumkin.
   */
  await enforcePublicRateLimit('publicCatalog', getRequestContext(request).ipAddress ?? 'anonim');

  const categories = await listJobCategories();

  return apiSuccess({ categories }, { requestId });
});
