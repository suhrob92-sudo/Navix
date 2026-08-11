'use client';

import * as Sentry from '@sentry/nextjs';
import { useReportWebVitals } from 'next/web-vitals';

import { isObservabilityEnabled } from '@/lib/observability';

/**
 * Sahifa tezligini o'lchaydi.
 *
 * ── Nima o'lchanadi ───────────────────────────────────────────────────
 * LCP — asosiy mazmun qachon ko'rindi (odam "sahifa ochildi" deb
 *       hisoblaydigan payt);
 * INP — tugma bosilgandan javobgacha ketgan vaqt;
 * CLS — sahifa yuklanayotganda mazmun qanchalik "sakraydi" (odam
 *       bosmoqchi bo'lgan tugma joyidan siljib ketishi).
 *
 * ── Nima uchun o'lchash KERAK ─────────────────────────────────────────
 * Ishlab chiqishdagi tezlik haqiqatga aloqador emas: bu yerda tez
 * internet va kuchli kompyuter. O'zbekistondagi foydalanuvchi esa
 * eski telefonda, sekin 3G'da turibdi.
 *
 * O'lchovsiz "sekin" degan shikoyatga javob topib bo'lmaydi: qaysi
 * sahifa, qaysi qism, qancha sekin — hech biri ma'lum bo'lmaydi.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (!isObservabilityEnabled) {
      /**
       * Kuzatuv o'chiq bo'lsa hech narsa yuborilmaydi.
       *
       * Ishlab chiqishda esa qiymatlar konsolda ko'rinadi — bu
       * telefondan sinash paytida ham foydali.
       */
      if (process.env.NODE_ENV === 'development') {
        console.info(`[tezlik] ${metric.name}: ${Math.round(metric.value)} (${metric.rating})`);
      }

      return;
    }

    /**
     * O'lchov "distribution" sifatida yuboriladi.
     *
     * ── Nima uchun o'rtacha qiymat YETARLI EMAS ─────────────────────
     * O'rtacha tezlik chalg'itadi: yuzta tez ochilish o'ntа juda
     * sekin ochilishni yashiradi. Taqsimot esa "eng sekin 10% qancha
     * kutdi" degan savolga javob beradi — muammo aynan o'sha yerda.
     */
    Sentry.setMeasurement(metric.name, metric.value, metric.name === 'CLS' ? 'none' : 'millisecond');
  });

  // Bu komponent hech narsa chizmaydi — u faqat o'lchaydi.
  return null;
}
