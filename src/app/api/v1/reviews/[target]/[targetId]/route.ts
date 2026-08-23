import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { targetFromSlug } from '@/config/review';
import { NotFoundError } from '@/lib/api/errors';
import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { optionalAuth, requireAuth } from '@/modules/auth/auth.guard';
import { reviewListQuerySchema, upsertReviewSchema } from '@/modules/review/review.schemas';
import { listReviews, removeReview, upsertReview } from '@/modules/review/review.service';
import type { ReviewMutationResponse, ReviewsResponse } from '@/modules/review/review.types';

/**
 * Baho va sharh.
 *
 * ── Nima uchun BITTA manzil beshta emas ───────────────────────────────
 * Mahsulot, taom, restoran, do'kon va mehmonxona uchun alohida
 * manzil yozish mumkin edi, lekin ularning ichidagi kod bir xil
 * bo'lardi va "faqat xaridor" qoidasi beshta joyda takrorlanardi.
 *
 * Bitta manzilda esa qoida ham bitta joyda: `findPurchaseProof`.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  target: z.string(),
  targetId: z.uuid("ID noto'g'ri"),
});

type Params = { target: string; targetId: string };

function readParams(raw: Params) {
  const parsed = paramsSchema.parse(raw);
  const target = targetFromSlug(parsed.target);

  if (!target) {
    throw new NotFoundError('Sahifa');
  }

  return { target, targetId: parsed.targetId };
}

/**
 * GET — sharhlar ro'yxati.
 *
 * Kirish TALAB QILINMAYDI: baho ochiq ma'lumot va uni xarid
 * qilishdan oldin ko'rish kerak. Kirgan odam esa qo'shimcha
 * ravishda o'z sharhini va huquqini oladi.
 */
export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const { target, targetId } = readParams(await params);
  const auth = await optionalAuth(request);

  const query = reviewListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  const result = await listReviews(target, targetId, auth?.userId ?? null, query);

  return apiSuccess<ReviewsResponse>(result, { requestId });
});

/** POST — baho qo'yish yoki o'zgartirish. */
export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { target, targetId } = readParams(await params);

  await enforcePublicRateLimit('review', auth.userId, "Juda tez-tez baho qo'yyapsiz. Biroz kuting.");

  const input = await parseJsonBody(request, upsertReviewSchema);

  const result = await upsertReview(target, targetId, auth.userId, input);

  return apiSuccess<ReviewMutationResponse>(result, { requestId, status: 201 });
});

/** DELETE — o'z bahosini olib tashlash. */
export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { target, targetId } = readParams(await params);

  await enforcePublicRateLimit('review', auth.userId, 'Juda tez-tez amal qilyapsiz. Biroz kuting.');

  const summary = await removeReview(target, targetId, auth.userId);

  return apiSuccess<ReviewMutationResponse>({ summary, mine: null }, { requestId });
});
