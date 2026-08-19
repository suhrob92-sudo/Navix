'use client';

import { useEffect } from 'react';

/**
 * Video ko'rilayotganda ekranni O'CHIRMAYDI.
 *
 * ── Nima uchun bu KERAK bo'lib qoldi ──────────────────────────────────
 * Telefon 30 soniya tegilmasa ekranni o'chiradi. Qisqa reel ko'rayotgan
 * odam har necha soniyada ekranga tegadi — muammo sezilmasdi.
 *
 * 10 daqiqalik video esa boshqa: odam telefonni ushlab, hech narsaga
 * tegmay tomosha qiladi va yarim daqiqadan keyin ekran qorayadi. U
 * tegib yoritadi, yana qorayadi — va oxiri videoni tashlab ketadi.
 *
 * ── Nima uchun barcha brauzerda ishlamaydi ────────────────────────────
 * `WakeLock` — nisbatan yangi imkoniyat. iOS Safari'da u faqat
 * so'nggi versiyalarda bor. Shuning uchun har bir chaqiruv
 * tekshiriladi va yo'q bo'lsa — hech narsa qilinmaydi: ilova
 * avvalgidek ishlashda davom etadi.
 *
 * ── Nima uchun sahifa yashiringanda BO'SHATILADI ──────────────────────
 * Brauzer sahifa fonga o'tganda qulfni o'zi bekor qiladi. Odam
 * qaytib kelganda esa uni QAYTA olish kerak — aks holda birinchi
 * marta ishlab, keyin jimgina to'xtardi.
 *
 * @param isActive Hozir video o'ynayaptimi.
 */
export function useScreenAwake(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return;

    /*
      Turni `unknown` orqali tekshiramiz.

      `navigator.wakeLock` barcha brauzerlarda yo'q va TypeScript
      turlari uni majburiy deb biladi. To'g'ridan-to'g'ri
      o'qilsa, eski brauzerda xato chiqardi.
    */
    const api = (navigator as Navigator & { wakeLock?: WakeLockAPI }).wakeLock;

    if (!api) return;

    let sentinel: WakeLockSentinel | null = null;
    let isCancelled = false;

    async function acquire() {
      try {
        const next = await api!.request('screen');

        /*
          Kutish paytida holat o'zgargan bo'lishi mumkin.

          Odam videoni to'xtatib ulgurgan bo'lsa, qulf darhol
          bo'shatiladi — aks holda u ekranni bekorga yoqib
          turardi.
        */
        if (isCancelled) {
          void next.release();

          return;
        }

        sentinel = next;
      } catch {
        /*
          Rad etilishi MUTLAQO normal.

          Batareya kam bo'lsa yoki sahifa fonda bo'lsa, brauzer
          qulfni bermaydi. Bu xato emas va odamga ko'rsatiladigan
          narsa ham emas.
        */
      }
    }

    void acquire();

    /** Sahifa qaytib ko'ringanda qulfni qayta olamiz. */
    function onVisible() {
      if (document.visibilityState === 'visible' && sentinel === null) void acquire();
    }

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', onVisible);

      void sentinel?.release();
      sentinel = null;
    };
  }, [isActive]);
}

/** Brauzerdagi qulf — turlar hamma joyda mavjud emas. */
interface WakeLockSentinel {
  release: () => Promise<void>;
}

interface WakeLockAPI {
  request: (type: 'screen') => Promise<WakeLockSentinel>;
}
