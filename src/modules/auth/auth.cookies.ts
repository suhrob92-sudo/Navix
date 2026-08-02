import type { NextResponse } from 'next/server';

import { isProduction, serverEnv } from '@/lib/env';

/**
 * Refresh token'ni cookie'da saqlash.
 *
 * Nima uchun cookie, localStorage emas:
 *  - `httpOnly` — JavaScript cookie'ni o'qiy olmaydi, shuning uchun XSS
 *    hujumida token o'g'irlanmaydi;
 *  - `secure` — faqat HTTPS orqali yuboriladi;
 *  - `sameSite=lax` — boshqa saytdan yuborilgan so'rovlarga qo'shilmaydi (CSRF himoyasi);
 *  - `path` — faqat auth endpointlariga yuboriladi, boshqa so'rovlarni og'irlashtirmaydi.
 *
 * Access token esa cookie'da saqlanmaydi — u javob tanasida qaytadi va
 * brauzer xotirasida (RAM) turadi.
 */

export const REFRESH_COOKIE_NAME = 'navix_refresh_token';

/** Cookie faqat shu manzillarga yuboriladi. */
const REFRESH_COOKIE_PATH = '/api/v1/auth';

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
