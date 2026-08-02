import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { setRefreshCookie } from '@/modules/auth/auth.cookies';
import { verifyOtpSchema } from '@/modules/auth/auth.schemas';
import { verifyPhone } from '@/modules/auth/auth.service';

/**
 * POST /api/v1/auth/verify-otp — SMS kodni tasdiqlash.
 *
 * Muvaffaqiyatli bo'lsa:
 *  - hisob faollashadi va `CUSTOMER` roli beriladi;
 *  - hamyon ochiladi;
 *  - access token javob tanasida, refresh token httpOnly cookie'da qaytadi.
 */
export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const input = await parseJsonBody(request, verifyOtpSchema);
  const context = getRequestContext(request);

  const { refreshToken, ...result } = await verifyPhone(input, { ...context, requestId });

  const response = apiSuccess(result, { requestId });
  setRefreshCookie(response, refreshToken);

  return response;
});
