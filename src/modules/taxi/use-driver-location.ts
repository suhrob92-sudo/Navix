'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { isAccurateEnough } from '@/config/delivery-eta';
import { TAXI_LOCATION_REPORT_SECONDS } from '@/config/taxi';
import { useApiClient } from '@/hooks/use-api';

/**
 * Haydovchining joylashuvini yuborib turadi.
 *
 * ── Kuryernikidan IKKI farqi bor ──────────────────────────────────────
 * 1. Manzil SAFARGA bog'liq emas. Haydovchi safar olishdan OLDIN ham
 *    joylashuvini yuboradi: aks holda tizim unga yaqin buyurtmani
 *    topa olmasdi. Shuning uchun so'rov `/taxi/driver/location` ga
 *    ketadi, safar ID'siga emas.
 *
 * 2. Tez-tez yuboriladi (8 soniya, kuryerda 20). Mashina 20 soniyada
 *    300 metr yurib ketadi — xaritadagi belgi sezilarli darajada
 *    orqada qolardi.
 *
 * ── Nima uchun ruxsat HAR SAFAR so'raladi ─────────────────────────────
 * Kuryerdagi bilan bir xil sabab: rozilikni brauzerda saqlab qo'ysak,
 * ilova haydovchi bilmagan holda joylashuv yuborib turardi —
 * masalan u eski sahifani ochiq qoldirgan bo'lsa.
 *
 * Bu yerda esa u ONLAYN tugmasiga bog'langan: haydovchi "ishga
 * chiqdim" desa kuzatuv yonadi, "ishni tugatdim" desa o'chadi. Bu
 * bitta tushunarli boshqaruv.
 */

export type DriverLocationStatus = 'OFF' | 'ASKING' | 'SHARING' | 'DENIED' | 'FAILED';

export interface DriverLocationState {
  status: DriverLocationStatus;
  error: string | null;
  /** Oxirgi muvaffaqiyatli yuborish — ISO. */
  sentAt: string | null;
  /** Oxirgi ma'lum nuqta — buyurtma ro'yxatini so'rashda ishlatiladi. */
  point: { latitude: number; longitude: number } | null;
  /** Kuzatuvni yoqadi — "Onlayn" tugmasidan chaqiriladi. */
  start: () => void;
  /** Kuzatuvni o'chiradi. */
  stop: () => void;
}

/**
 * @param isOnline Haydovchi ishga chiqqanmi. `false` bo'lsa kuzatuv
 *   butunlay to'xtaydi — ishlamayotgan odamni kuzatish yaramaydi.
 */
export function useDriverLocation(isOnline: boolean): DriverLocationState {
  const request = useApiClient();

  const [watchStatus, setStatus] = useState<DriverLocationStatus>('OFF');
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);

  const watchRef = useRef<number | null>(null);
  /** Oxirgi yuborish vaqti — tez-tez yuborishning oldini oladi. */
  const lastSentRef = useRef(0);
  /** Yuborish jarayonidami — so'rovlar ustma-ust tushmasligi uchun. */
  const isSendingRef = useRef(false);

  const stopWatch = useCallback(() => {
    if (watchRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
    }

    watchRef.current = null;
  }, []);

  const send = useCallback(
    async (position: GeolocationPosition) => {
      /*
        Telefon yangi nuqtani sekundiga bir necha marta berishi
        mumkin. Serverga esa shuncha tez-tez yuborish shart emas.
      */
      const elapsed = (Date.now() - lastSentRef.current) / 1000;

      if (elapsed < TAXI_LOCATION_REPORT_SECONDS || isSendingRef.current) return;

      /*
        Qo'pol nuqta yuborilmaydi. Bu XATO emas: haydovchi aybdor
        emas va bir necha soniyadan keyin aniqroq nuqta keladi.
      */
      if (!isAccurateEnough(position.coords.accuracy)) return;

      isSendingRef.current = true;

      try {
        await request<{ accepted: boolean }>('/api/v1/taxi/driver/location', {
          method: 'POST',
          body: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        });

        lastSentRef.current = Date.now();
        setSentAt(new Date().toISOString());
        setError(null);
      } catch {
        /*
          Tarmoq uzilishi haydovchi uchun ODATIY hol: u yo'lda,
          ko'prik ostida yoki zaif qoplamada bo'lishi mumkin.

          Shuning uchun xato ekranga chiqarilmaydi va kuzatuv
          to'xtamaydi — keyingi nuqta o'zi yuboriladi.
        */
      } finally {
        isSendingRef.current = false;
      }
    },
    [request],
  );

  /**
   * Kuzatuvni boshlaydi.
   *
   * ── Nima uchun effektdan emas, TUGMADAN chaqiriladi ─────────────────
   * Brauzer joylashuv ruxsatini faqat foydalanuvchi HARAKATIDAN keyin
   * so'raydi. Sahifa ochilishida avtomatik so'ralsa, ba'zi brauzerlar
   * so'rovni jimgina rad etadi va haydovchi nima uchun buyurtma
   * kelmayotganini tushunmasdi.
   *
   * "Onlayn" tugmasi esa aynan shu harakat: haydovchi ishga
   * chiqqanini o'zi bildiradi.
   */
  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('FAILED');
      setError("Bu qurilma joylashuvni qo'llab-quvvatlamaydi.");

      return;
    }

    setStatus('ASKING');
    setError(null);

    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setStatus('SHARING');
        setPoint({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        void send(position);
      },
      (failure) => {
        stopWatch();

        if (failure.code === failure.PERMISSION_DENIED) {
          setStatus('DENIED');
          setError('Joylashuvga ruxsat berilmadi. Ruxsatsiz sizga buyurtma tushmaydi.');

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

  const stop = useCallback(() => {
    stopWatch();
    setStatus('OFF');
    setError(null);
  }, [stopWatch]);

  /*
    Oflayn bo'lganda va sahifadan chiqilganda kuzatuv TO'XTAYDI.

    `watchPosition` tozalanmasa, GPS orqada ishlab turaverardi va
    haydovchining batareyasini bekorga yeb qo'yardi.
  */
  useEffect(() => {
    if (!isOnline) {
      stopWatch();

      return;
    }

    return () => stopWatch();
  }, [isOnline, stopWatch]);

  /*
    Oflayn bo'lsa holat HAR DOIM "o'chiq".

    Uni effekt ichida yozish ham mumkin edi, lekin o'shanda bitta
    haqiqat ikki joyda saqlanardi: kuzatuv to'xtagan, holat esa hali
    "yuborilmoqda" deb turgan lahza paydo bo'lardi.
  */
  const status: DriverLocationStatus = isOnline ? watchStatus : 'OFF';

  return { status, error, sentAt, point: isOnline ? point : null, start, stop };
}
