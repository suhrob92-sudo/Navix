import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { respond } from '@/modules/assistant/assistant.service';

/**
 * POST /api/v1/assistant — AI Yordamchiga xabar yuborish.
 *
 * Javobda `action` bo'lishi mumkin. Agar u `confirm_*` bo'lsa — bu
 * FAQAT tayyorlangan buyruq: pul hali harakatlanmagan. Foydalanuvchi
 * tasdiqlagach mijoz odatdagi endpointga murojaat qiladi va barcha
 * tekshiruvlar o'sha yerda ishlaydi.
 */
export const dynamic = 'force-dynamic';

/** Holat mijozda saqlanadi va shu yerda qaytib keladi. */
const stateSchema = z.object({
  intent: z.string().max(40).optional(),
  slots: z
    .object({
      amountSom: z.number().int().positive().max(100_000_000).optional(),
      providerId: z.uuid().optional(),
      providerName: z.string().max(120).optional(),
      accountNumber: z.string().max(60).optional(),
      phone: z.string().max(20).optional(),
      recipientName: z.string().max(120).optional(),
    })
    .default({}),
});

const bodySchema = z.object({
  message: z.string().trim().min(1, "Xabar bo'sh").max(500, 'Xabar juda uzun'),
  state: stateSchema.optional(),
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, bodySchema);

  const result = await respond(auth.userId, input.message, input.state ?? { slots: {} });

  return apiSuccess(result, { requestId, headers: { 'cache-control': 'no-store' } });
});
