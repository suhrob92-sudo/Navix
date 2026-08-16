import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { explainPost } from '@/modules/feed/recommend.service';
import type { PostReasonResponse } from '@/modules/feed/reason.types';

interface Params {
  id: string;
}

/**
 * GET /api/v1/posts/[id]/why — "Nima uchun buni ko'ryapman?"
 *
 * ── Nima uchun bu manzil kerak ────────────────────────────────────────
 * Lenta tartibi odamning xatti-harakatidan o'rganadi va bu jarayon
 * ko'rinmas. Ko'rinmas tizim esa ishonchsizlik tug'diradi: "nega
 * menga aynan shu ko'rsatilyapti?" degan savolga javob bo'lmasa,
 * odam eng yomonini o'ylaydi.
 *
 * Javob esa aynan o'sha formuladan olinadi — ya'ni u haqiqiy, taxmin
 * emas.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);

  const reason = await explainPost(auth.userId, parseIdParam((await params).id));

  return apiSuccess<PostReasonResponse>({ reason }, { requestId, headers: { 'cache-control': 'no-store' } });
});
