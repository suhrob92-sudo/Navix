'use client';

import { useSyncExternalStore } from 'react';

/**
 * Internet bormi — ilova bo'ylab yagona javob.
 *
 * ── Nima uchun alohida do'kon (store) ─────────────────────────────────
 * `navigator.onLine` — React'dan TASHQARIDAGI holat. Uni `useEffect`
 * ichida o'qish ikki muammo tug'diradi:
 *
 *   1. Serverda `navigator` yo'q. Chizish paytida o'qisak, server va
 *      brauzer boshqa natija berardi (hydration mismatch).
 *   2. Effekt ichida `setState` chaqirish ortiqcha qayta chizishga
 *      olib keladi — loyihaning lint qoidasi buni taqiqlaydi.
 *
 * `useSyncExternalStore` aynan shu holat uchun yasalgan: server bir
 * qiymat, brauzer boshqa qiymat qaytaradi va React ikkalasini
 * to'g'ri boshqaradi.
 *
 * ── Nima uchun bu qiymatga TO'LIQ ishonib bo'lmaydi ───────────────────
 * `navigator.onLine` faqat "tarmoqqa ulanganmi" degan savolga javob
 * beradi. Wi-Fi ulangan, lekin internet chiqmaydigan holatda u
 * `true` qaytaradi.
 *
 * Ya'ni `false` — ANIQ internet yo'q, `true` — "ehtimol bor".
 * Shuning uchun u faqat OGOHLANTIRISH uchun ishlatiladi, so'rov
 * yuborish-yubormaslikni hal qilish uchun emas.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Oxirgi o'qilgan qiymat.
 *
 * `getSnapshot` har chizishda BIR XIL qiymat qaytarishi shart.
 * `navigator.onLine` ni har safar o'qish ham to'g'ri ishlardi
 * (u oddiy `boolean`), lekin keshlash orqali xatti-harakat
 * boshqa do'konlar bilan bir xil bo'ladi.
 */
let cached: boolean | null = null;

function update() {
  cached = navigator.onLine;

  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  if (listeners.size === 0) {
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    /*
      Oxirgi tinglovchi ketganda hodisalar ham UZILADI.

      Aks holda sahifadan sahifaga o'tganda tinglovchilar
      to'planib qolardi.
    */
    if (listeners.size === 0) {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      cached = null;
    }
  };
}

function getSnapshot(): boolean {
  if (cached === null) cached = navigator.onLine;

  return cached;
}

/**
 * Serverda HAR DOIM "internet bor".
 *
 * Server sahifani chizayotgan bo'lsa, so'rov unga yetib kelgan —
 * ya'ni internet bor edi. "Yo'q" deb chizish ekranga bir zumga
 * noto'g'ri ogohlantirish chiqarardi.
 */
function getServerSnapshot(): boolean {
  return true;
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
