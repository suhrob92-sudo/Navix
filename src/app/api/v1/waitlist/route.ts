import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
import { joinWaitlistSchema } from '@/modules/waitlist/waitlist.schemas';
import { getWaitlistStats, joinWaitlist } from '@/modules/waitlist/waitlist.service';

/**
 * GET  /api/v1/waitlist — navbatdagilar soni.
 * POST /api/v1/waitlist — navbatga yozilish.
 *
 * ── Kirish TALAB QILINMAYDI ───────────────────────────────────────────
 * Butun mazmuni shunda: odam hali ro'yxatdan o'ta olmaydi, ilova
 * ochilmagan. Shuning uchun bu yerda token yo'q.
 *
 * ── Himoya ────────────────────────────────────────────────────────────
 * Ochiq endpoint robot uchun oson nishon. Bir IP'dan soatiga besh
 * marta — odam uchun bemalol, skript uchun foydasiz.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (_request: NextRequest, { requestId }) => {
  const stats = await getWaitlistStats();

  return apiSuccess(stats, { requestId });
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const context = getRequestContext(request);

  await enforcePublicRateLimit(
    'waitlist',
    context.ipAddress ?? 'unknown',
    "Juda ko'p urinish. Bir ozdan so'ng qayta urinib ko'ring.",
  );

  const input = await parseJsonBody(request, joinWaitlistSchema);

  const result = await joinWaitlist(input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess(result, { requestId, status: result.alreadyJoined ? 200 : 201 });
});
