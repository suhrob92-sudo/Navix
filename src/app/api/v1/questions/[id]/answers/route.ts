import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { answerQuestionSchema } from '@/modules/product/product-qa.schemas';
import { answerQuestion } from '@/modules/product/product-qa.service';
import type { QuestionMutationResponse } from '@/modules/product/product-qa.types';

/**
 * POST /api/v1/questions/[id]/answers — savolga javob berish.
 *
 * ── Nima uchun manzilda MAHSULOT yo'q ─────────────────────────────────
 * Savol allaqachon bitta mahsulotga bog'langan va uni ikkinchi
 * marta ko'rsatishning ma'nosi yo'q. Bundan tashqari ikkita ID
 * berilsa, ular bir-biriga mos kelishini ham tekshirish kerak
 * bo'lardi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Savol ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await enforcePublicRateLimit('productQuestion', auth.userId, 'Juda tez-tez javob berayapsiz. Biroz kuting.');

  const input = await parseJsonBody(request, answerQuestionSchema);

  const question = await answerQuestion(id, auth.userId, input);

  return apiSuccess<QuestionMutationResponse>({ question }, { requestId, status: 201 });
});
