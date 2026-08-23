import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { recentTargetFromSlug } from '@/config/recent';
import { NotFoundError } from '@/lib/api/errors';
import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { recordView, removeRecentView } from '@/modules/recent/recent.service';

/**
 * Ko'rilganini belgilash.
 *
 * ── Nima uchun BRAUZER yuboradi, sahifa emas ──────────────────────────
 * Buni sahifaning o'zi (server tomonida) ham yozishi mumkin edi va
 * u qo'shimcha so'rovni tejardi.
 *
 * Lekin unda HAR BIR ochilish — izlovchi robot ham, tasodifiy
 * havola ham — tarixga tushardi. Bundan tashqari mahsulot sahifasi
 * hozir statik chiziladi va yozuv uni har bir foydalanuvchi uchun
 * qaytadan hisoblanadigan qilib qo'yardi.
 *
 * Brauzer esa faqat HAQIQIY odam sahifani ochganda yuboradi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  target: z.string(),
  targetId: z.uuid("ID noto'g'ri"),
});

type Params = { target: string; targetId: string };

function readParams(raw: Params) {
  const parsed = paramsSchema.parse(raw);
  const target = recentTargetFromSlug(parsed.target);

  if (!target) {
    throw new NotFoundError('Sahifa');
  }

  return { target, targetId: parsed.targetId };
}

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { target, targetId } = readParams(await params);

  await enforcePublicRateLimit('recentView', auth.userId, 'Juda tez-tez sahifa ochyapsiz.');

  await recordView(target, targetId, auth.userId);

  return apiSuccess({ ok: true }, { requestId, status: 201 });
});

/** DELETE — bitta yozuvni ro'yxatdan olib tashlash. */
export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { target, targetId } = readParams(await params);

  await enforcePublicRateLimit('recentView', auth.userId, 'Juda tez-tez amal qilyapsiz.');

  const count = await removeRecentView(target, targetId, auth.userId);

  return apiSuccess({ count }, { requestId });
});
