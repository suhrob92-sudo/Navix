import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
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
  /*
    ── Nima uchun EGALIK yetarli emas edi ────────────────────────────
    Bu yerda avval faqat `requireAuth` turardi va izohda "egalik
    tekshiriladi, u qat'iyroq" deb yozilgandi.

    Ma'lumot uchun bu to'g'ri: `shop.ownerId` begona so'rovni
    ko'rsatmaydi.

    Lekin ROL — platformaning sotuvchini O'CHIRISH mexanizmi.
    Admin kimningdir SELLER rolini olib tashlasa, u do'kon egasi
    bo'lib qolaveradi va qaytarish so'rovlarini tasdiqlashda davom
    etardi. Ya'ni "sotuvchini to'xtatish" tugmasi ishlamasdi.

    Endi IKKALASI ham tekshiriladi: rol — kirish uchun, egalik —
    qaysi ma'lumot ko'rinishi uchun.
  */
  const auth = await requirePermission(request, Permission.SELLER_DASHBOARD_ACCESS);

  await enforcePublicRateLimit('publicCatalog', auth.userId);

  const raw = new URL(request.url).searchParams.get('status');
  const status = raw && STATUSES.has(raw) ? (raw as ReturnStatusName) : undefined;

  const requests = await listShopReturns(auth.userId, status);

  return apiSuccess<ReturnsResponse>({ requests }, { requestId });
});
