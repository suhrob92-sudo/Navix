import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { clearRefreshCookie } from '@/modules/auth/auth.cookies';
import { resetPasswordSchema } from '@/modules/auth/auth.schemas';
import { resetPassword } from '@/modules/auth/auth.service';

/**
 * POST /api/v1/auth/password/reset — SMS kod bilan yangi parol o'rnatish.
 *
 * Parol o'zgargach BARCHA qurilmalardagi sessiyalar bekor qilinadi.
 * Bu majburiy xavfsizlik chorasi: agar hisobga begona kirgan bo'lsa,
 * u ham chiqarib yuboriladi.
 */
export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const input = await parseJsonBody(request, resetPasswordSchema);
  const context = getRequestContext(request);

  await resetPassword(input, { ...context, requestId });

  const response = apiSuccess(
    { passwordChanged: true, message: 'Parol yangilandi. Yangi parol bilan kiring.' },
    { requestId },
  );
  clearRefreshCookie(response);

  return response;
});
