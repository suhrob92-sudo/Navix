import * as Sentry from '@sentry/nextjs';

import { IGNORED_ERRORS, SENTRY_DSN, SENTRY_ENVIRONMENT, TRACES_SAMPLE_RATE } from '@/lib/observability';

/**
 * "Edge" muhitidagi xato kuzatuvi.
 *
 * ── Bu qanday muhit ───────────────────────────────────────────────────
 * Next.js ba'zi kodni oddiy Node.js'da emas, cheklangan "edge"
 * muhitida ishlatadi (masalan `proxy.ts` — har so'rovdan oldin
 * ishlaydigan tekshiruv). U yerda Node kutubxonalari yo'q, shuning
 * uchun sozlama ALOHIDA fayl bo'lishi kerak.
 *
 * Sozlamalar serverdagi bilan bir xil: farqi faqat qayerda
 * ishlashida.
 */
Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,
  tracesSampleRate: TRACES_SAMPLE_RATE,
  ignoreErrors: IGNORED_ERRORS,
  sendDefaultPii: false,

  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
      delete event.request.data;
    }

    return event;
  },
});
