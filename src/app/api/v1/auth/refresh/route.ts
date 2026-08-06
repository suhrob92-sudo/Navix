import type { NextRequest } from 'next/server';

import { AppError, ErrorCode, UnauthorizedError } from '@/lib/api/errors';
import { withApiHandler } from '@/lib/api/handler';
import { apiError, apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { REFRESH_COOKIE_NAME, clearRefreshCookie, setRefreshCookie } from '@/modules/auth/auth.cookies';
import { rotateSession } from '@/modules/auth/session.service';
import { verifyRefreshToken } from '@/modules/auth/token.service';

/**
 * POST /api/v1/auth/refresh — access token'ni yangilash.
 *
 * Refresh token cookie'dan olinadi (JavaScript uni o'qiy olmaydi).
 * Har yangilashda refresh token ham almashtiriladi (token rotation) —
 * eski token darhol yaroqsiz bo'ladi.
 */
export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const token = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!token) {
    throw new UnauthorizedError('Sessiya topilmadi. Qaytadan kiring.');
  }

  const context = getRequestContext(request);

  let payload;
  try {
    payload = await verifyRefreshToken(token);
  } catch {
    // Token buzuq yoki eskirgan — cookie'ni tozalab, aniq xabar qaytaramiz.
    // Aks holda foydalanuvchi har safar shu xatolikka duch kelaverardi.
    const response = apiError({
      requestId,
      code: ErrorCode.UNAUTHORIZED,
      message: 'Sessiya muddati tugagan. Qaytadan kiring.',
      status: 401,
    });
    clearRefreshCookie(response);
    return response;
  }

  /**
   * ── Sessiya YOPIQ bo'lsa cookie ham tozalanadi ─────────────────────
   * `rotateSession` sessiya bekor qilingan yoki muddati tugagan
   * bo'lsa 401 tashlaydi. Ilgari bunda cookie brauzerda QOLIB
   * ketardi va oqibati og'ir edi:
   *
   *   brauzer  →  "sessiyam yo'q"  →  /auth/login ga o'tadi
   *   proxy    →  "cookie bor-ku!" →  /dashboard ga qaytaradi
   *   brauzer  →  "sessiyam yo'q"  →  /auth/login ga o'tadi ...
   *
   * Cheksiz aylanish, va ekranda abadiy skelet. Aynan shu sabab
   * sahifa "qotib qolgandek" ko'rinardi.
   *
   * Endi 401 bilan birga cookie ham o'chadi — aylanishning ildizi
   * shu yerda uziladi.
   */
  let rotated;
  try {
    rotated = await rotateSession(payload.sessionId, token, context);
  } catch (error) {
    if (error instanceof AppError && error.status === 401) {
      const response = apiError({
        requestId,
        code: ErrorCode.UNAUTHORIZED,
        message: error.message,
        status: 401,
      });
      clearRefreshCookie(response);
      return response;
    }

    throw error;
  }

  const { refreshToken, ...tokens } = rotated;

  /**
   * Bu yerda audit yozuvi ATAYLAB yo'q.
   *
   * Token har 14 daqiqada va ilova har ochilganda yangilanadi. Har
   * safar yozuv qoldirilsa, 100 000 foydalanuvchida kuniga millionlab
   * qator paydo bo'lardi va audit jurnalida haqiqiy hodisalar
   * (to'lov, bloklash, rol o'zgarishi) ular orasida ko'rinmay ketardi.
   *
   * Bundan tashqari bu ma'lumot allaqachon saqlanadi: `rotateSession`
   * sessiyaning `lastUsedAt` va IP maydonini yangilaydi. Ya'ni "qaysi
   * qurilma qachon faol bo'lgan" degan savolga javob yo'qolmaydi.
   */
  const response = apiSuccess(tokens, { requestId });

  /**
   * `refreshToken` `null` bo'lsa cookie'ga TEGILMAYDI.
   *
   * Bu — bir vaqtda kelgan ikkinchi so'rov. Uning yonidagi so'rov
   * allaqachon yangi tokenni cookie'ga yozgan; bu yerda qayta yozish
   * ikkalasining javobini bir-biriga urishtirardi.
   */
  if (refreshToken !== null) {
    setRefreshCookie(response, refreshToken);
  }

  return response;
});
