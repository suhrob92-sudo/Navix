import type { NextResponse } from 'next/server';

import { isProduction, serverEnv } from '@/lib/env';

/**
 * Refresh token'ni cookie'da saqlash.
 *
 * Nima uchun cookie, localStorage emas:
 *  - `httpOnly` — JavaScript cookie'ni o'qiy olmaydi, shuning uchun XSS
 *    hujumida token o'g'irlanmaydi;
 *  - `secure` — faqat HTTPS orqali yuboriladi (production'da);
 *  - `sameSite=lax` — boshqa saytdan yuborilgan so'rovlarga qo'shilmaydi (CSRF himoyasi).
 *
 * Access token esa cookie'da saqlanmaydi — u javob tanasida qaytadi va
 * brauzer xotirasida (RAM) turadi.
 */

export const REFRESH_COOKIE_NAME = 'navix_refresh_token';

/**
 * Cookie butun sayt bo'ylab yuboriladi.
 *
 * Nima uchun faqat `/api/v1/auth` emas: `middleware.ts` sahifa so'rovlarida
 * cookie bor-yo'qligini ko'rib, kirmagan foydalanuvchini darhol kirish
 * sahifasiga yo'naltiradi. Cookie tor yo'lga bog'lansa, middleware uni
 * umuman ko'rmaydi va kirgan foydalanuvchi ham login sahifasiga tashlanadi.
 *
 * Xavfsizlik pasaymaydi: token baribir `httpOnly` va `sameSite=lax`.
 */
const REFRESH_COOKIE_PATH = '/';

/** Javobga refresh token cookie'sini qo'shadi. */
export function setRefreshCookie(response: NextResponse, refreshToken: string): void {
  response.cookies.set({
    name: REFRESH_COOKIE_NAME,
    value: refreshToken,
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: serverEnv().JWT_REFRESH_TTL,
  });
}

/** Cookie'ni o'chiradi (chiqish). */
export function clearRefreshCookie(response: NextResponse): void {
  response.cookies.set({
    name: REFRESH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: 0,
  });
}
