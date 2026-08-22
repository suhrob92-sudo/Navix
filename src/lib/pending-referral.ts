'use client';

import { cleanReferralCode, isReferralCode } from '@/config/referral';

/**
 * Taklif kodini ro'yxatdan o'tishgacha SAQLAB turish.
 *
 * ── Muammo ────────────────────────────────────────────────────────────
 * Odam taklif havolasini ochadi (`/i/ABC1234`), lekin darhol
 * ro'yxatdan o'tmaydi: avval ilova haqida o'qiydi, telefonini
 * qidiradi, boshqa sahifalarni ochadi.
 *
 * Manzildagi kod esa birinchi o'tishdayoq yo'qoladi. Ya'ni odam
 * ro'yxatdan o'tganda uni KIM taklif qilgani noma'lum bo'lib
 * qolardi va butun tizim ishlamasdi.
 *
 * ── Nima uchun `localStorage`, cookie emas ────────────────────────────
 * Cookie har bir so'rov bilan serverga yuboriladi — bu kod hamma
 * so'rovga qo'shilib yurishi degani, holbuki u faqat BITTA so'rovda
 * kerak.
 *
 * `localStorage` esa brauzerda qoladi va faqat kerak bo'lganda
 * o'qiladi.
 *
 * ── Nima uchun muddat YO'Q ────────────────────────────────────────────
 * Kod ro'yxatdan o'tilgach darhol o'chiriladi. Odam ro'yxatdan
 * o'tmasa, kod uning brauzerida qoladi — lekin u hech qanday
 * zarar keltirmaydi va o'lchami bir necha bayt.
 */

const PENDING_KEY = 'navix.referral.pending';

/** Kodni saqlaydi. Noto'g'ri kod SAQLANMAYDI. */
export function rememberReferral(code: string): void {
  const clean = cleanReferralCode(code);

  if (!isReferralCode(clean)) return;

  try {
    window.localStorage.setItem(PENDING_KEY, clean);
  } catch {
    /*
      Xotira yopiq (shaxsiy rejim).

      Taklif hisobga olinmaydi, lekin ro'yxatdan o'tish
      avvalgidek davom etadi.
    */
  }
}

/** Saqlangan kodni qaytaradi. */
export function readPendingReferral(): string | undefined {
  try {
    const value = window.localStorage.getItem(PENDING_KEY);

    if (!value) return undefined;

    /*
      O'qishda ham TEKSHIRILADI.

      Qiymatni brauzer konsoli orqali qo'lda o'zgartirish mumkin.
      Buzilgan kod serverga yuborilsa, ro'yxatdan o'tish
      tekshiruvdan o'tmasdi — ya'ni odam begona aralashuv tufayli
      ro'yxatdan o'ta olmay qolardi.
    */
    return isReferralCode(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Ro'yxatdan o'tilgach chaqiriladi. */
export function clearPendingReferral(): void {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // O'chirib bo'lmasa ham keyingi o'qishda qayta yuborilishi zarar qilmaydi.
  }
}
