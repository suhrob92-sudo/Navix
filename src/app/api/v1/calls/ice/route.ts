import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { buildIceServers } from '@/modules/call/call.service';

/**
 * GET /api/v1/calls/ice — ulanish serverlari ro'yxati.
 *
 * ── Nima uchun alohida yo'l ───────────────────────────────────────────
 * Qo'ng'iroqni BOSHLAGAN tomon bu ro'yxatni javob bilan birga oladi.
 * Qabul qiluvchida esa qo'ng'iroq kutilmaganda keladi — unga ro'yxatni
 * shu yerdan olish kerak.
 *
 * ── Nima uchun ochiq emas ─────────────────────────────────────────────
 * Ro'yxatda TURN serverining kaliti bo'lishi mumkin. U bilan begonalar
 * ham trafik sarflay olardi, hisob esa bizga kelardi. Shu sababli javob
 * faqat tizimga kirganlarga beriladi va keshlanmaydi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requireAuth(request);

  return apiSuccess({ iceServers: buildIceServers() }, { requestId });
});
