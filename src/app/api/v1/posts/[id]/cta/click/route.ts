import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { markCtaClicked } from '@/modules/feed/feed.service';

/**
 * POST /api/v1/posts/[id]/cta/click — chaqiruv tugmasi bosildi.
 *
 * ── Nima uchun BIRIKTIRMADAN alohida manzil ───────────────────────────
 * Biriktirma bosilishi sotuvchining ko'rsatkichi, chaqiruv esa
 * muallifning o'zi haqida: "necha kishi obuna bo'ldi, necha kishi
 * yozdi". Ikkalasini bitta songa qo'shsak, muallif "videom sotdimi
 * yoki obunachi keltirdimi?" degan savolga javob topa olmasdi.
 *
 * ── Nima uchun bunda nishon ID si YO'Q ────────────────────────────────
 * Bir postda chaqiruv BITTA. Uning ID si bo'lishi kerak emas —
 * postning o'zi yetarli.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('postShare', auth.userId, "Juda ko'p so'rov. Biroz kuting.");

  await markCtaClicked(id, auth.userId);

  return apiSuccess({ counted: true }, { requestId });
});
