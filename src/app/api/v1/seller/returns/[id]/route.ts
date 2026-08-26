import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { decideReturnSchema } from '@/modules/market/return.schemas';
import { decideReturn } from '@/modules/market/return.service';
import type { ReturnResponse } from '@/modules/market/return.types';

/**
 * PATCH /api/v1/seller/returns/[id] — so'rovni tasdiqlash yoki rad etish.
 *
 * ── Nima uchun bitta manzil, ikkita emas ──────────────────────────────
 * `/approve` va `/reject` alohida bo'lishi ham mumkin edi.
 *
 * Lekin ikkalasi ham BITTA qarorni yozadi va ikkalasida ham xuddi
 * shu tekshiruvlar takrorlanardi: egalikmi, so'rov hali
 * ko'rilmaganmi, ikki marta bosilmadimi.
 *
 * Bitta manzilda bu tekshiruvlar bir marta yoziladi.
 */
export const dynamic = 'force-dynamic';

export const PATCH = withApiHandler(
  async (request: NextRequest, { requestId, params }) => {
    /*
      ── Nima uchun EGALIK yetarli emas edi ──────────────────────────
      Bu yerda avval faqat `requireAuth` turardi va izohda "egalik
      tekshiriladi, u qat'iyroq" deb yozilgandi.

      Ma'lumot uchun bu to'g'ri: `shop.ownerId` begona so'rovni
      ko'rsatmaydi.

      Lekin ROL — platformaning sotuvchini O'CHIRISH mexanizmi.
      Admin kimningdir SELLER rolini olib tashlasa, u do'kon egasi
      bo'lib qolaveradi va qaytarish so'rovlarini tasdiqlashda
      davom etardi — ya'ni "sotuvchini to'xtatish" ishlamasdi.

      Endi ikkalasi ham tekshiriladi: rol — kirish uchun, egalik —
      qaysi ma'lumot ko'rinishi uchun.
    */
    const auth = await requirePermission(request, Permission.SELLER_DASHBOARD_ACCESS);

    const { id } = await params;

    await enforcePublicRateLimit('returnRequest', auth.userId, "Juda ko'p so'rov. Biroz kuting.");

    const input = await parseJsonBody(request, decideReturnSchema);

    const decided = await decideReturn(auth.userId, id, input, {
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    return apiSuccess<ReturnResponse>({ request: decided }, { requestId });
  },
);
