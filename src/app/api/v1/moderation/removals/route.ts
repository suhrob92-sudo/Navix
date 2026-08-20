import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listMyRemovals } from '@/modules/moderation/moderation.service';

/**
 * GET /api/v1/moderation/removals — mening olib tashlangan yozuvlarim.
 *
 * ── Nima uchun FAQAT o'zimniki ────────────────────────────────────────
 * Kimning qaysi yozuvi olib tashlangani — shaxsiy ma'lumot. Uni
 * boshqa odamga ochish "kim qoidabuzar?" degan ro'yxat yasash
 * imkonini berardi.
 *
 * Shuning uchun so'rovda ID umuman qabul qilinmaydi: ro'yxat har
 * doim so'rayotgan odamniki.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const removals = await listMyRemovals(auth.userId);

  return apiSuccess({ removals }, { requestId, headers: { 'cache-control': 'no-store' } });
});
