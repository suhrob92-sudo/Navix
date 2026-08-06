/**
 * Kirish talab qiladigan sahifalar — YAGONA ro'yxat.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * Bu ro'yxat IKKI joyda kerak:
 *
 *  1. `src/proxy.ts` — cookie yo'q bo'lsa kirish sahifasiga yuboradi;
 *  2. `next.config.ts` — bu sahifalarning HTML'ini KESHLAMASLIKNI
 *     buyuradi (sababi quyida).
 *
 * Ikkita nusxa yuritilsa, ertaga yangi bo'lim qo'shilganda bittasida
 * unutilardi va xato jimgina paydo bo'lardi. Shuning uchun manba bitta.
 *
 * ── Fayl SOF bo'lishi shart ───────────────────────────────────────────
 * `next.config.ts` Next.js ishga tushishidan OLDIN o'qiladi. Shu sababli
 * bu yerda hech qanday import yo'q va bo'lmasligi ham kerak.
 *
 * ── Nima uchun HTML keshlanmasligi kerak ──────────────────────────────
 * Bu sahifalar "qobiq": ular serverda skelet ko'rinishida chiziladi,
 * haqiqiy ma'lumot esa brauzerdagi JavaScript orqali API'dan keladi.
 *
 * Yangi versiya chiqarilganda JavaScript fayllarining nomi o'zgaradi.
 * Agar brauzerda ESKI HTML keshda qolsa, u endi mavjud bo'lmagan
 * fayllarni so'raydi:
 *
 *     eski HTML  →  /_next/static/chunks/abc123.js  →  404
 *
 * Natijada JavaScript ishga tushmaydi va foydalanuvchi ABADIY skeletni
 * ko'rib turadi — sahifa "qotib qolgandek" bo'ladi. Aynan shu xato
 * production'da yuz berdi.
 *
 * Keshlashning foydasi bu yerda deyarli yo'q (qobiq bir necha kilobayt),
 * zarari esa katta. Shuning uchun bu sahifalar har safar yangi olinadi.
 */

export const PROTECTED_PREFIXES = [
  '/dashboard',
  '/welcome',
  '/profile',
  '/addresses',
  '/devices',
  '/notifications',
  '/security',
  '/wallet',
  '/payments',
  '/food',
  '/orders',
  '/marketplace',
  '/jobs',
  '/merchant',
  '/seller',
  '/courier',
  /**
   * Admin panel.
   *
   * `proxy.ts` da faqat "kirganmi?" tekshiriladi — ROL tekshiruvi
   * bo'lmaydi, chunki rol tokenda va uni ochish uchun maxfiy kalit
   * kerak (proxy har so'rovda ishlaydi, tez bo'lishi shart). Haqiqiy
   * himoya `/api/v1/admin/*` endpointlarida: `requirePermission()`.
   */
  '/admin',
] as const;

/**
 * `next.config.ts` uchun manzil naqshlari.
 *
 * Next.js `headers()` da `:path*` ko'rinishi ishlatiladi: `/wallet` ning
 * o'zi ham, `/wallet/history` ham qamrab olinadi.
 */
export function protectedPathPatterns(): string[] {
  return PROTECTED_PREFIXES.flatMap((prefix) => [prefix, `${prefix}/:path*`]);
}
