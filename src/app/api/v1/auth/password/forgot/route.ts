import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { forgotPasswordSchema } from '@/modules/auth/auth.schemas';
import { requestPasswordReset } from '@/modules/auth/auth.service';

/**
 * POST /api/v1/auth/password/forgot — parolni tiklash uchun SMS kod so'rash.
 *
 * Raqam tizimda bo'lmasa ham muvaffaqiyatli javob qaytadi. Bu ataylab
 * qilingan: aks holda hujumchi qaysi raqamlar ro'yxatda ekanini aniqlab olardi.
 */
export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const { phone } = await parseJsonBody(request, forgotPasswordSchema);
  const context = getRequestContext(request);

  const result = await requestPasswordReset(phone, { ...context, requestId });

  return apiSuccess(result, { requestId });
});
