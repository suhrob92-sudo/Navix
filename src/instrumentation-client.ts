import { reportClientError } from '@/lib/client-error-reporter';

/**
 * Brauzerdagi xatolarni ushlash.
 *
 * ── Nima uchun brauzer tomoni ALOHIDA kerak ───────────────────────────
 * Serverdagi loglar faqat server xatolarini ko'rsatadi. Ilovaning
 * katta qismi esa brauzerda ishlaydi: tugma bosilmadi, ro'yxat
 * chizilmadi, ekran oq bo'lib qoldi — bularning hech biri server
 * logida ko'rinmaydi.
 *
 * Foydalanuvchi esa ko'pincha shikoyat qilmaydi: u shunchaki ilovani
 * yopadi va qaytmaydi.
 *
 * ── Bu fayl NIMA UCHUN shu yerda ──────────────────────────────────────
 * Next.js `instrumentation-client.ts` faylini ilova ishga tushishidan
 * OLDIN bajaradi. Ya'ni tinglovchilar birinchi xatodan ham oldin
 * o'rnatiladi — aks holda eng erta xatolar tushib qolardi.
 */

/** Kutilmagan xato (masalan `undefined` funksiyani chaqirish). */
window.addEventListener('error', (event) => {
  reportClientError(event.error ?? event.message, window.location.pathname);
});

/**
 * Ushlanmagan `Promise` xatosi.
 *
 * Bu eng ko'p uchraydigan tur: `await` qilingan so'rov xato bersa va
 * uni hech kim tutmasa, shu hodisa chiqadi.
 */
window.addEventListener('unhandledrejection', (event) => {
  reportClientError(event.reason, window.location.pathname);
});
