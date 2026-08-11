'use client';

import { useReportWebVitals } from 'next/web-vitals';

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
 * ── Nima uchun faqat ISHLAB CHIQISHDA ko'rsatiladi ────────────────────
 * Har o'lchov uchun serverga so'rov yuborilsa, bu foydalanuvchining
 * trafigini sarflardi — ya'ni tezlikni o'lchash vositasi ilovani
 * sekinlashtirardi.
 *
 * Production'dagi haqiqiy tezlikni Vercel o'zi o'lchaydi
 * (Analytics -> Speed Insights) va u bepul. Bu yerdagi o'lchov esa
 * telefondan sinash paytida darhol ko'rish uchun: konsolda chiqadi.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== 'development') return;

    console.info(`[tezlik] ${metric.name}: ${Math.round(metric.value)} (${metric.rating})`);
  });

  // Bu komponent hech narsa chizmaydi — u faqat o'lchaydi.
  return null;
}
