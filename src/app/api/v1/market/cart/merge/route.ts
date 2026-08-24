import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { mergeCartSchema } from '@/modules/market/cart.schemas';
import { mergeLocalCart } from '@/modules/market/cart.service';
import type { CartResponse } from '@/modules/market/cart.types';

/**
 * POST /api/v1/market/cart/merge — brauzerdagi eski savatni ko'chirish.
 *
 * ── Nima uchun ALOHIDA manzil ─────────────────────────────────────────
 * Oddiy "qo'shish" dan farqi bor: bu yerda bir nechta qator birdan
 * keladi va ular SERVERDAGI savat bilan solishtiriladi, ustiga
 * yozilmaydi.
 *
 * Bundan tashqari bu so'rov har bir odamda faqat BIR MARTA
 * yuboriladi — savat serverga ko'chgandan keyingi birinchi
 * kirishda.
 *
 * ── Nima uchun takrorlansa ham xavfsiz ────────────────────────────────
 * Miqdorlar qo'shilmaydi, eng kattasi olinadi. Sabab
 * `mergeCartLines` izohida.
 */
export const dynamic = 'force-dynamic';

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  await enforcePublicRateLimit('cartWrite', auth.userId, "Juda ko'p so'rov. Biroz kuting.");

  const input = await parseJsonBody(request, mergeCartSchema);

  const cart = await mergeLocalCart(
    auth.userId,
    input.lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId ?? null,
      quantity: line.quantity,
    })),
  );

  return apiSuccess<CartResponse>({ cart }, { requestId });
});
