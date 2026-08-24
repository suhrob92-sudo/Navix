import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listShopReturns } from '@/modules/market/return.service';
import type { ReturnStatusName } from '@/config/order-return';
import type { ReturnsResponse } from '@/modules/market/return.types';

/**
 * GET /api/v1/seller/returns — sotuvchining do'konlariga kelgan so'rovlar.
 *
 * ── Nima uchun rolga qarab tekshirilmaydi ─────────────────────────────
 * Ro'yxat `shop.ownerId` bo'yicha filtrlanadi: sotuvchi faqat O'Z
 * do'koniga kelgan so'rovlarni ko'radi.
 *
 * Ya'ni bu yerda "SELLER roli" emas, EGALIK tekshiriladi — u
 * ancha qat'iyroq shart.
 */
export const dynamic = 'force-dynamic';

const STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED']);

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const raw = new URL(request.url).searchParams.get('status');
  const status = raw && STATUSES.has(raw) ? (raw as ReturnStatusName) : undefined;

  const requests = await listShopReturns(auth.userId, status);

  return apiSuccess<ReturnsResponse>({ requests }, { requestId });
});
