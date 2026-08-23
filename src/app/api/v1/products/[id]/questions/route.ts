import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler, parseJsonBody } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { optionalAuth, requireAuth } from '@/modules/auth/auth.guard';
import {
  askQuestionSchema,
  questionListQuerySchema,
} from '@/modules/product/product-qa.schemas';
import { askQuestion, listQuestions } from '@/modules/product/product-qa.service';
import type {
  QuestionMutationResponse,
  QuestionsResponse,
} from '@/modules/product/product-qa.types';

/**
 * Mahsulot haqidagi savollar.
 *
 * ── Nima uchun GET kirish talab qilmaydi ──────────────────────────────
 * Savol-javob — mahsulot haqidagi ochiq ma'lumot va u sotib
 * olishdan OLDIN kerak. Kirgan odam esa qo'shimcha ravishda
 * "savol bera olamanmi?" degan javobni oladi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Mahsulot ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const { id } = paramsSchema.parse(await params);
  const auth = await optionalAuth(request);

  const query = questionListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  const result = await listQuestions(id, auth?.userId ?? null, query);

  return apiSuccess<QuestionsResponse>(result, { requestId });
});

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await enforcePublicRateLimit('productQuestion', auth.userId, "Juda tez-tez savol berayapsiz. Biroz kuting.");

  const input = await parseJsonBody(request, askQuestionSchema);

  const question = await askQuestion(id, auth.userId, input);

  return apiSuccess<QuestionMutationResponse>({ question }, { requestId, status: 201 });
});
