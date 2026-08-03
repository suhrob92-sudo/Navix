import { NextResponse, type NextRequest } from 'next/server';

import { REFRESH_COOKIE_NAME } from '@/modules/auth/auth.cookies';

/**
 * Sahifalarni tez filtrlash (soft gate).
 *
 * Next.js 16'dan boshlab bu fayl `middleware.ts` emas, `proxy.ts` deb ataladi
 * va funksiya `export default` bilan chiqariladi.
 *
 * MUHIM: bu HIMOYA EMAS, balki QULAYLIK. Bu yerda faqat refresh cookie
 * bor-yo'qligi ko'riladi — cookie'ning haqiqiyligi tekshirilmaydi (buning
 * uchun bazaga murojaat kerak, bu fayl esa har so'rovda ishlaydi va tez
 * bo'lishi shart).
 *
 * Haqiqiy himoya ikki joyda:
 *  1. API endpointlarida — `requireAuth()` token'ni to'liq tekshiradi;
 *  2. Sahifalarda — `<RequireAuth>` komponenti.
 *
 * Bu yerdagi tekshiruv shunchaki: cookie umuman yo'q bo'lsa, sahifani
 * yuklab o'tirmasdan darhol kirish sahifasiga yuboramiz. Shunda foydalanuvchi
 * bo'sh skeletni ko'rmaydi.
 */

/** Kirish talab qiladigan sahifalar. */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/profile',
  '/addresses',
  '/devices',
  '/notifications',
  '/security',
  '/wallet',
  '/payments',
  /**
   * Admin panel.
   *
   * Bu yerda faqat "kirganmi?" tekshiriladi — ROL tekshiruvi bo'lmaydi,
   * chunki rol tokenda va uni ochish uchun maxfiy kalit kerak (bu fayl
   * har so'rovda ishlaydi, tez bo'lishi shart). Haqiqiy himoya
   * `/api/v1/admin/*` endpointlarida: `requirePermission()`.
   */
  '/admin',
];

/** Kirgan foydalanuvchiga keraksiz sahifalar (kirish, ro'yxatdan o'tish). */
const GUEST_ONLY_PATHS = ['/auth/login', '/auth/register'];

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(REFRESH_COOKIE_NAME);

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && !hasSessionCookie) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);

    return NextResponse.redirect(loginUrl);
  }

  if (GUEST_ONLY_PATHS.includes(pathname) && hasSessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Statik fayllar va API uchun ishlamaydi —
   * ular o'z himoyasiga ega va har bir rasm uchun tekshiruv keraksiz.
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
