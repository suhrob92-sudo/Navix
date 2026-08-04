import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { respond } from '@/modules/assistant/assistant.service';
import { assistantMessageSchema } from '@/modules/assistant/assistant.schemas';

/**
 * POST /api/v1/assistant — AI Yordamchiga xabar yuborish.
 *
 * Javobda `action` bo'lishi mumkin. Agar u `confirm_*` bo'lsa — bu
 * FAQAT tayyorlangan buyruq: pul hali harakatlanmagan. Foydalanuvchi
 * tasdiqlagach mijoz odatdagi endpointga murojaat qiladi va barcha
 * tekshiruvlar o'sha yerda ishlaydi.
 */
export const dynamic = 'force-dynamic';

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, assistantMessageSchema);

  const result = await respond(auth.userId, input.message, input.state ?? { slots: {} });

  return apiSuccess(result, { requestId, headers: { 'cache-control': 'no-store' } });
});
