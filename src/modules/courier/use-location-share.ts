'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { LOCATION_REPORT_SECONDS, isAccurateEnough } from '@/config/delivery-eta';
import { useApiClient } from '@/hooks/use-api';

/**
 * Kuryerning joylashuvini yuborib turadi.
 *
 * ── Nima uchun kuryerdan RUXSAT so'raladi ─────────────────────────────
 * Joylashuv — odamning eng nozik ma'lumoti. Uni so'ramasdan yig'ish
 * texnik jihatdan mumkin, lekin bu kuryerni kuzatuv ostiga olish
 * bo'lardi.
 *
 * Shuning uchun tugma bor va u kuryerning O'ZIDA. Yoqilmasa,
 * yetkazishning qolgan hammasi ishlayveradi — mijoz shunchaki
 * xarita o'rniga taxminiy vaqtni ko'radi.
 *
 * ── Nima uchun HAR topshiriqda qaytadan so'raladi ─────────────────────
 * Rozilikni brauzerda saqlab, keyingi topshiriqda o'zi yoqilsa,
 * kuryerga qulayroq bo'lardi — kuniga bir necha bosish tejalardi.
 *
 * Lekin o'shanda ilova kuryer bilmagan holda joylashuv yubora
 * boshlardi: u eski sahifani ochib qo'ygan bo'lsa ham. Bitta bosish
 * evaziga "hozir kuzatuv YOQILDI" degan aniqlik qoladi va bu
 * muhimroq.
 *
 * Kuryer allaqachon har topshiriqda uch marta tugma bosadi
 * ("olaman", "oldim", "topshirdim") — bu to'rtinchisi o'sha qatorda.
 *
 * ── Nima uchun `watchPosition`, takroriy `getCurrentPosition` emas ────
 * `watchPosition` telefonning o'z GPS oqimiga ulanadi va yangi nuqta
 * paydo bo'lgandagina xabar beradi. Takroriy so'rov esa har safar
 * GPS ni qaytadan uyg'otardi — bu batareyani ancha tez yeydi.
 */

export type ShareStatus = 'OFF' | 'ASKING' | 'SHARING' | 'DENIED' | 'FAILED';

export interface LocationShareState {
  status: ShareStatus;
  error: string | null;
  /** Oxirgi muvaffaqiyatli yuborish — ISO. */
  sentAt: string | null;
  start: () => void;
  stop: () => void;
}

/**
 * @param deliveryId Qaysi topshiriq uchun.
 * @param isActive Topshiriq hali kuryerning qo'lidami. `false` bo'lsa
 *   kuzatuv butunlay to'xtaydi — ish tugagach odamni kuzatish yaramaydi.
 */
export function useLocationShare(deliveryId: string, isActive: boolean): LocationShareState {
  const request = useApiClient();

  const [watchStatus, setStatus] = useState<ShareStatus>('OFF');
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);

  const watchRef = useRef<number | null>(null);
  /** Oxirgi yuborish vaqti — tez-tez yuborishning oldini oladi. */
  const lastSentRef = useRef(0);
  /** Yuborish jarayonidami — so'rovlar ustma-ust tushmasligi uchun. */
  const isSendingRef = useRef(false);

  const stopWatch = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const send = useCallback(
    async (position: GeolocationPosition) => {
      /*
        Telefon yangi nuqtani sekundiga bir necha marta berishi
        mumkin. Serverga esa shuncha tez-tez yuborish shart emas.
      */
      const elapsed = (Date.now() - lastSentRef.current) / 1000;

      if (elapsed < LOCATION_REPORT_SECONDS || isSendingRef.current) return;

      if (!isAccurateEnough(position.coords.accuracy)) {
        /*
          Qo'pol nuqtani yubormaymiz. Bu XATO emas: kuryer aybdor
          emas va bir necha soniyadan keyin aniqroq nuqta keladi.
        */
        return;
      }

      isSendingRef.current = true;

      try {
        const result = await request<{ reportedAt: string }>(
          `/api/v1/courier/deliveries/${deliveryId}/location`,
          {
            method: 'POST',
            body: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
          },
        );

        lastSentRef.current = Date.now();
        setSentAt(result.reportedAt);
        setError(null);
      } catch {
        /*
          Tarmoq uzilishi kuryer uchun ODATIY hol: u yo'lda, tunnelda
          yoki zaif qoplamada bo'lishi mumkin.

          Shuning uchun xato ekranga chiqarilmaydi va kuzatuv
          to'xtamaydi — keyingi nuqta o'zi yuboriladi.
        */
      } finally {
        isSendingRef.current = false;
      }
    },
    [deliveryId, request],
  );

  const startWatch = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('FAILED');
      setError("Bu brauzer joylashuvni qo'llab-quvvatlamaydi.");
      return;
    }

    setStatus('ASKING');
    setError(null);

    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setStatus('SHARING');
        void send(position);
      },
      (failure) => {
        stopWatch();

        if (failure.code === failure.PERMISSION_DENIED) {
          setStatus('DENIED');
          setError("Joylashuvga ruxsat berilmadi. Brauzer sozlamalaridan yoqishingiz mumkin.");
          return;
        }

        setStatus('FAILED');
        setError("Joylashuvni aniqlab bo'lmadi. Ochiq joyga chiqib qayta urinib ko'ring.");
      },
      {
        // Aniqlik muhim: mobil tarmoq bo'yicha topilgan nuqta yaramaydi.
        enableHighAccuracy: true,
        timeout: 20_000,
        // Telefon o'zida saqlangan eski nuqtani bermasin.
        maximumAge: 0,
      },
    );
  }, [send, stopWatch]);

  const start = useCallback(() => {
    startWatch();
  }, [startWatch]);

  const stop = useCallback(() => {
    stopWatch();
    setStatus('OFF');
    setError(null);
  }, [stopWatch]);

  /*
    Topshiriq tugagach kuzatuv o'zi to'xtaydi. Sahifadan chiqilganda
    ham shunday — `watchPosition` tozalanmasa, GPS orqada ishlab
    turaverardi.
  */
  useEffect(() => {
    if (!isActive) {
      stopWatch();
      return;
    }

    return () => stopWatch();
  }, [isActive, stopWatch]);

  /*
    Topshiriq faol bo'lmasa holat HAR DOIM "o'chiq".

    Uni effekt ichida yozish ham mumkin edi, lekin o'shanda bitta
    haqiqat ikki joyda saqlanardi: kuzatuv to'xtagan, holat esa hali
    "yuborilmoqda" deb turgan lahza paydo bo'lardi.
  */
  const status: ShareStatus = isActive ? watchStatus : 'OFF';

  return { status, error, sentAt, start, stop };
}
