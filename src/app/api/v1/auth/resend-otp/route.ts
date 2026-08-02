import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { resendOtpSchema } from '@/modules/auth/auth.schemas';
import { resendVerificationOtp } from '@/modules/auth/auth.service';

/**
 * POST /api/v1/auth/resend-otp — tasdiqlash kodini qayta yuborish.
 *
 * Xavfsizlik: raqam tizimda bor-yo'qligidan qat'i nazar bir xil javob
 * qaytadi — hujumchi qaysi raqamlar ro'yxatda ekanini bila olmaydi.
 */
export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const { phone } = await parseJsonBody(request, resendOtpSchema);

  const result = await resendVerificationOtp(phone);

  return apiSuccess(result, { requestId });
});
