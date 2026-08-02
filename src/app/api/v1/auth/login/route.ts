import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { setRefreshCookie } from '@/modules/auth/auth.cookies';
import { loginSchema } from '@/modules/auth/auth.schemas';
import { login } from '@/modules/auth/auth.service';

/**
 * POST /api/v1/auth/login — telefon raqami va parol bilan kirish.
 *
 * Har bir kirish alohida sessiya (qurilma) yaratadi.
 */
export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const input = await parseJsonBody(request, loginSchema);
  const context = getRequestContext(request);

  const { refreshToken, ...result } = await login(input, { ...context, requestId });

  const response = apiSuccess(result, { requestId });
  setRefreshCookie(response, refreshToken);

  return response;
});
