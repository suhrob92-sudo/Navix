import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listPostsForTarget } from '@/modules/feed/attachment.service';
import { linkedPostsQuerySchema } from '@/modules/feed/feed.schemas';

/**
 * GET /api/v1/feed/linked — shu narsa ko'rsatilgan videolar.
 *
 * Zanjirning teskari tomoni: mahsulot, taom, restoran, ish yoki
 * mehmonxona sahifasi o'zi haqidagi videolarni ko'rsatadi.
 *
 * ── Nima uchun kirish TALAB qilinadi ──────────────────────────────────
 * Ro'yxat ko'ruvchiga MOSLANADI: bloklangan odamlarning videosi
 * chiqarib tashlanadi va har bir postda "yoqtirdimmi, saqladimmi"
 * belgisi bor. Bularning hammasi kim so'rayotganini bilishni talab
 * qiladi.
 *
 * Sahifalarning o'zi ham shundoq ham kirishni talab qiladi
 * (`(cabinet)` guruhi), shuning uchun bu qo'shimcha to'siq emas.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, linkedPostsQuerySchema);

  const posts = await listPostsForTarget(query.kind, query.targetId, auth.userId, query.limit);

  return apiSuccess({ posts }, { requestId, headers: { 'cache-control': 'no-store' } });
});
