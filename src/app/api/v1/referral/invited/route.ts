import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { invitedQuerySchema } from '@/modules/referral/referral.schemas';
import { listInvited } from '@/modules/referral/referral.service';
import type { ReferralListResponse } from '@/modules/referral/referral.types';

/**
 * GET /api/v1/referral/invited — men taklif qilgan odamlar.
 *
 * Telefon raqami QAYTARILMAYDI: havola begona odamga ham yuborilishi
 * mumkin va u orqali raqam to'plash mumkin bo'lardi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, invitedQuerySchema);

  const result = await listInvited(auth.userId, query.page);

  return apiSuccess<ReferralListResponse>(result, {
    requestId,
    headers: { 'cache-control': 'no-store' },
  });
});
