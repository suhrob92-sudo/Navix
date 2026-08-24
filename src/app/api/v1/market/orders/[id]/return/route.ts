import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createReturnSchema } from '@/modules/market/return.schemas';
import { createReturn, getReturnForOrder } from '@/modules/market/return.service';
import type { ReturnResponse } from '@/modules/market/return.types';

/**
 * Buyurtma bo'yicha qaytarish so'rovi.
 *
 *   GET  — mavjud so'rovni o'qish
 *   POST — yangi so'rov yuborish
 *
 * ── Nima uchun buyurtma manzili ostida ────────────────────────────────
 * So'rov har doim BITTA buyurtmaga tegishli va bitta buyurtmada
 * ko'pi bilan bitta so'rov bo'ladi.
 *
 * Alohida `/returns` manzili bo'lsa, "qaysi buyurtma" degan
 * ma'lumot tanaga ko'chardi va uni har safar tekshirish kerak
 * bo'lardi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(
  async (request: NextRequest, { requestId, params }) => {
    const auth = await requireAuth(request);
    const { id } = await params;

    const found = await getReturnForOrder(auth.userId, id);

    return apiSuccess<{ request: ReturnResponse['request'] | null }>(
      { request: found },
      { requestId },
    );
  },
);

export const POST = withApiHandler(
  async (request: NextRequest, { requestId, params }) => {
    const auth = await requireAuth(request);
    const { id } = await params;

    /*
      Chegara qat'iy: qaytarish PUL bilan bog'liq amal va uni
      ketma-ket yuborishga hech qanday sabab yo'q.
    */
    await enforcePublicRateLimit('returnRequest', auth.userId, "Juda ko'p so'rov. Biroz kuting.");

    const input = await parseJsonBody(request, createReturnSchema);

    const created = await createReturn(auth.userId, id, input, {
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    return apiSuccess<ReturnResponse>({ request: created }, { requestId });
  },
);
