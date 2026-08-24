import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { previewCart, type CartPreviewResult } from '@/modules/market/cart-preview.service';
import { MAX_CART_LINES, MAX_ITEM_QUANTITY } from '@/modules/market/market.schemas';

/**
 * POST /api/v1/market/cart-preview — savatdagi narx va zaxira.
 *
 * ── Nima uchun POST, GET emas ─────────────────────────────────────────
 * Savatda 30 tagacha qator bo'lishi mumkin va har birida ikkita ID
 * bor. Ularni manzilga yozsak, manzil juda uzun bo'lib ketardi va
 * ba'zi tarmoqlar uni kesib qo'yardi.
 *
 * ── Nima uchun bu manzil PUL BILAN bog'liq emas ───────────────────────
 * Bu yerdagi narx faqat KO'RSATISH uchun. Buyurtma berilganda narx
 * yana bir marta, `createMarketOrder` ichida bazadan o'qiladi.
 */
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  shopId: z.uuid("Do'kon ID noto'g'ri"),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        variantId: z.uuid().optional(),
        quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
      }),
    )
    .max(MAX_CART_LINES),
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requireAuth(request);

  const input = await parseJsonBody(request, bodySchema);

  const result = await previewCart(input.shopId, input.items);

  return apiSuccess<CartPreviewResult>(result, { requestId });
});
