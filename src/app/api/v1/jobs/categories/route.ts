import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
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

export const GET = withApiHandler(async (_request: NextRequest, { requestId }) => {
  const categories = await listJobCategories();

  return apiSuccess({ categories }, { requestId });
});
