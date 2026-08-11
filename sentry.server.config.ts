import * as Sentry from '@sentry/nextjs';

import { IGNORED_ERRORS, SENTRY_DSN, SENTRY_ENVIRONMENT, TRACES_SAMPLE_RATE } from '@/lib/observability';

/**
 * Server tomonidagi xato kuzatuvi.
 *
 * DSN berilmasa `Sentry.init` hech narsa qilmaydi — ilova xuddi
 * kuzatuvsiz kabi ishlayveradi. Shuning uchun bu yerda qo'shimcha
 * shart yozilmagan.
 */
Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,
  tracesSampleRate: TRACES_SAMPLE_RATE,
  ignoreErrors: IGNORED_ERRORS,

  /**
   * Shaxsiy ma'lumot YUBORILMAYDI.
   *
   * ── Nima uchun bu MUHIM ─────────────────────────────────────────────
   * Sentry sukut bo'yicha so'rov sarlavhalarini, cookie'larni va IP
   * manzilni yuboradi. Bizda esa sarlavhada `Authorization` tokeni,
   * cookie'da esa refresh token bor.
   *
   * Ular xato hisobotiga tushsa, hisobotni ko'ra oladigan har bir odam
   * foydalanuvchi hisobiga kira olardi. Bu — eng jiddiy turdagi
   * ma'lumot sizib chiqishi.
   */
  sendDefaultPii: false,

  /**
   * Xato yuborishdan OLDIN tozalash.
   *
   * `sendDefaultPii: false` ko'p narsani to'sadi, lekin bu yerda
   * qo'shimcha, ishonchli to'siq qo'yiladi: sarlavhalar va cookie
   * butunlay o'chiriladi.
   */
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
      delete event.request.data;
    }

    return event;
  },
});
