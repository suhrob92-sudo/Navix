import * as Sentry from '@sentry/nextjs';

import { IGNORED_ERRORS, SENTRY_DSN, SENTRY_ENVIRONMENT, TRACES_SAMPLE_RATE } from '@/lib/observability';

/**
 * Brauzerdagi xato kuzatuvi.
 *
 * ── Nima uchun brauzer tomoni ALOHIDA kerak ───────────────────────────
 * Serverdagi loglar faqat server xatolarini ko'rsatadi. Ilovaning
 * katta qismi esa brauzerda ishlaydi: tugma bosilmadi, ro'yxat
 * chizilmadi, ekran oq bo'lib qoldi — bularning hech biri server
 * logida ko'rinmaydi.
 *
 * Foydalanuvchi esa ko'pincha shikoyat qilmaydi: u shunchaki ilovani
 * yopadi va qaytmaydi.
 */
Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,
  tracesSampleRate: TRACES_SAMPLE_RATE,
  ignoreErrors: IGNORED_ERRORS,

  /**
   * Hisobotlar BIZNING domenimiz orqali o'tadi.
   *
   * Reklama to'sarlari (AdBlock, uBlock) Sentry domenini to'sadi va
   * usiz brauzerdagi xatolarning katta qismi umuman yetib kelmasdi.
   *
   * Uzatuvchi yo'l: `src/app/monitoring/route.ts`.
   */
  tunnel: '/monitoring',

  /**
   * Shaxsiy ma'lumot yuborilmaydi (server tomonidagi kabi).
   *
   * Brauzerda bu ayniqsa muhim: sahifada telefon raqami, hamyon
   * balansi va yozishmalar bo'lishi mumkin.
   */
  sendDefaultPii: false,

  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }

    return event;
  },
});

/**
 * Sahifadan sahifaga o'tishni kuzatadi.
 *
 * Usiz o'tish vaqti o'lchanmasdi: Next.js sahifani to'liq qayta
 * yuklamaydi, ya'ni brauzerning odatdagi o'lchovlari ishlamaydi.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
