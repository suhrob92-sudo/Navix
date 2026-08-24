import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
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
    const auth = await requireAuth(request);
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
