import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { markVideoViewed } from '@/modules/feed/feed.service';

/**
 * POST /api/v1/posts/[id]/view — video ko'rildi.
 *
 * ── Nima uchun chegara bor ────────────────────────────────────────────
 * Ko'rishlar soni sotuvchi uchun ko'rsatkich va reklama narxiga
 * ta'sir qiladi. Chegarasiz skript uni istalgan songa ko'tarib
 * qo'yardi va son ma'nosini yo'qotardi.
 *
 * Daqiqasiga 60 ta — odam bir daqiqada 60 ta videoni ko'ra olmaydi,
 * ya'ni halol foydalanuvchi buni sezmaydi ham.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  await enforcePublicRateLimit('videoView', auth.userId, "Juda ko'p so'rov. Biroz kuting.");

  await markVideoViewed(id, auth.userId);

  return apiSuccess({ counted: true }, { requestId });
});
