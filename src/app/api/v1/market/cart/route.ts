import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { scheduleCartReminders } from '@/modules/market/cart-reminder.service';
import {
  addToCartSchema,
  removeFromCartSchema,
  updateCartSchema,
} from '@/modules/market/cart.schemas';
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  setCartQuantity,
  setSavedForLater,
} from '@/modules/market/cart.service';
import type { CartResponse } from '@/modules/market/cart.types';

/**
 * Savat — o'qish va o'zgartirish.
 *
 *   GET    — savat va "keyinroq" ro'yxati, narxlari bilan
 *   POST   — mahsulot qo'shish
 *   PATCH  — miqdorni belgilash yoki "keyinroq" ga ko'chirish
 *   DELETE — bitta qatorni yoki butun savatni tozalash
 *
 * ── Nima uchun HAR BIR amal butun savatni qaytaradi ───────────────────
 * Faqat "muvaffaqiyatli" deb javob bersak, brauzer savatni qayta
 * so'rashi kerak bo'lardi — ya'ni har bir "+" bosishda IKKITA
 * so'rov.
 *
 * Butun savatni qaytarish esa ekranni bir so'rovda haqiqat bilan
 * moslashtiradi. Savat kichkina: 50 qatordan oshmaydi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const cart = await getCart(auth.userId);

  /*
    Unutilgan savatlar haqidagi eslatma SHU YERDA ishga tushadi.

    Serverssiz muhitda "har soatda bajar" degan jadval yo'q, shuning
    uchun ish odamlar ilovadan foydalanganda o'zi bajariladi.
    Redisdagi qulf uni soatiga bir martadan ko'p ishlatmaydi va
    javob KUTILMAYDI — sabab `cart-reminder.service.ts` da.
  */
  scheduleCartReminders();

  return apiSuccess<CartResponse>({ cart }, { requestId });
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  await enforcePublicRateLimit('cartWrite', auth.userId, "Juda ko'p so'rov. Biroz kuting.");

  const input = await parseJsonBody(request, addToCartSchema);

  const cart = await addToCart(auth.userId, input);

  return apiSuccess<CartResponse>({ cart }, { requestId });
});

export const PATCH = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  await enforcePublicRateLimit('cartWrite', auth.userId, "Juda ko'p so'rov. Biroz kuting.");

  const input = await parseJsonBody(request, updateCartSchema);

  /*
    Ikkala maydon birga kelsa, avval miqdor qo'yiladi: "keyinroq"
    ro'yxatiga ko'chirilayotgan qatorning soni ham saqlanishi kerak.
  */
  if (input.quantity !== undefined) {
    await setCartQuantity(auth.userId, {
      productId: input.productId,
      variantId: input.variantId,
      quantity: input.quantity,
    });
  }

  const cart =
    input.savedForLater === undefined
      ? await getCart(auth.userId)
      : await setSavedForLater(auth.userId, {
          productId: input.productId,
          variantId: input.variantId,
          savedForLater: input.savedForLater,
        });

  return apiSuccess<CartResponse>({ cart }, { requestId });
});

export const DELETE = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  await enforcePublicRateLimit('cartWrite', auth.userId, "Juda ko'p so'rov. Biroz kuting.");

  const input = removeFromCartSchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  const cart =
    input.all === 'true' || !input.productId
      ? await clearCart(auth.userId)
      : await removeFromCart(auth.userId, {
          productId: input.productId,
          variantId: input.variantId,
        });

  return apiSuccess<CartResponse>({ cart }, { requestId });
});
