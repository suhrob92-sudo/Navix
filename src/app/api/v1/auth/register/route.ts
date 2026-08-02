import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { registerSchema } from '@/modules/auth/auth.schemas';
import { register } from '@/modules/auth/auth.service';

/**
 * POST /api/v1/auth/register — yangi hisob yaratish.
 *
 * Hisob darhol faol bo'lmaydi: telefon raqamiga 6 xonali kod yuboriladi.
 * Kod tasdiqlangach hisob `ACTIVE` bo'ladi va token beriladi.
 */
export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const input = await parseJsonBody(request, registerSchema);
  const context = getRequestContext(request);

  const result = await register(input, { ...context, requestId });

  return apiSuccess(result, { requestId, status: 201 });
});
