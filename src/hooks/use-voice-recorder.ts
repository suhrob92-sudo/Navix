'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { MAX_VOICE_SECONDS, VOICE_BITRATE } from '@/modules/upload/upload.types';

/**
 * Ovoz yozib olish.
 *
 * ── Nima uchun alohida hook ───────────────────────────────────────────
 * Mikrofon bilan ishlash bir necha nozik qadamdan iborat: ruxsat
 * so'rash, formatni tanlash, yozishni to'xtatish va — eng muhimi —
 * mikrofonni O'CHIRISH.
 *
 * Oxirgisi unutilsa, telefonda mikrofon belgisi yonib turaveradi va
 * odam "bu ilova meni tinglayaptimi?" deb o'ylaydi. Shuning uchun
 * to'xtatish bir joyda, ishonchli qilib yozilgan.
 */

/**
 * Brauzer qo'llab-quvvatlaydigan formatni tanlaydi.
 *
 * ── Nima uchun tanlov KERAK ───────────────────────────────────────────
 * Android va Chrome WebM (Opus) yozadi, iPhone va Safari esa MP4 (AAC).
 * Bittasini majburlab qo'yilsa, ikkinchi guruh ovozli xabar yubora
 * olmasdi.
 *
 * `undefined` qaytsa — brauzer o'zi tanlaydi.
 */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;

  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

/** Brauzer ovoz yozishni umuman qo'llab-quvvatlaydimi. */
export function isVoiceRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export interface VoiceRecording {
  blob: Blob;
  seconds: number;
}

export interface VoiceRecorderState {
  isRecording: boolean;
  /** Yozish boshlanganidan beri o'tgan soniyalar. */
  seconds: number;
  error: string | null;
  clearError: () => void;
  start: () => Promise<void>;
  /** Yozishni tugatadi va natijani qaytaradi. */
  stop: () => Promise<VoiceRecording | null>;
  /** Yozishni bekor qiladi — natija saqlanmaydi. */
  cancel: () => void;
}

export function useVoiceRecorder(): VoiceRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const isCancelledRef = useRef(false);

  /**
   * Mikrofonni O'CHIRADI va hisoblagichni to'xtatadi.
   *
   * Har bir tugash yo'lida (to'xtatish, bekor qilish, sahifadan
   * chiqish) chaqiriladi — shuning uchun alohida funksiya.
   */
  const release = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  /**
   * Sahifadan chiqilsa mikrofon o'chadi.
   *
   * Usiz suhbatdan chiqib ketgan odamning mikrofoni yonib turaverardi.
   */
  useEffect(() => release, [release]);

  const start = useCallback(async () => {
    setError(null);

    if (!isVoiceRecordingSupported()) {
      setError("Bu brauzer ovoz yozishni qo'llab-quvvatlamaydi.");

      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        /**
         * Aks-sado va shovqin filtrlari YOQILADI.
         *
         * Telefon mikrofoni xona shovqinini ham yozadi. Bu filtrlarsiz
         * ovozli xabarni tinglash qiyin bo'lardi.
         */
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      const mimeType = pickMimeType();

      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        /**
         * 24 kbit/s — gap uchun yetarli sifat.
         *
         * Musiqa uchun kam, lekin bu yerda musiqa emas. Past tezlik
         * esa faylni kichik qiladi: ikki daqiqalik xabar ~350 KB.
         * Sekin mobil internetda bu hal qiluvchi farq.
         */
        audioBitsPerSecond: VOICE_BITRATE,
      });

      chunksRef.current = [];
      isCancelledRef.current = false;

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });

      recorder.start();

      recorderRef.current = recorder;
      streamRef.current = stream;
      startedAtRef.current = Date.now();

      setSeconds(0);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1_000);

        setSeconds(elapsed);

        /**
         * Chegaraga yetganda yozish O'ZI to'xtaydi.
         *
         * Aks holda odam gapirib turaveradi va yozuv chegaradan
         * oshgani uchun rad etilardi — ya'ni butun mehnati bekorga
         * ketardi.
         *
         * HISOBLAGICH ham to'xtatiladi: usiz raqam 2:00 dan oshib
         * o'saverardi, holbuki yozuv allaqachon tugagan. Yozuvning
         * o'zi saqlanadi — odam uni yuborishi yoki o'chirishi mumkin.
         */
        if (elapsed >= MAX_VOICE_SECONDS) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          setSeconds(MAX_VOICE_SECONDS);

          if (recorderRef.current?.state !== 'inactive') {
            recorderRef.current?.stop();
          }
        }
      }, 250);
    } catch (caught) {
      release();
      setIsRecording(false);

      /**
       * Ruxsat berilmagani — eng ko'p uchraydigan holat.
       *
       * Uni umumiy "xato" deb ko'rsatish foydasiz: odam nima
       * qilishni bilmaydi.
       */
      const isDenied = caught instanceof DOMException && caught.name === 'NotAllowedError';

      setError(
        isDenied
          ? 'Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.'
          : "Mikrofonni ochib bo'lmadi. Boshqa ilova uni band qilgan bo'lishi mumkin.",
      );
    }
  }, [release]);

  const stop = useCallback(async (): Promise<VoiceRecording | null> => {
    const recorder = recorderRef.current;

    if (!recorder) return null;

    const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1_000));

    /** Yig'ilgan bo'laklardan bitta fayl yasaydi. */
    const buildBlob = (): Blob | null => {
      if (isCancelledRef.current || chunksRef.current.length === 0) return null;

      return new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
    };

    const blob =
      /**
       * Yozuv ALLAQACHON to'xtagan bo'lishi mumkin — chegaraga
       * yetganda u o'zi to'xtaydi. O'shanda ma'lumot tayyor va
       * kutishning hojati yo'q.
       *
       * Kutilsa, hodisa hech qachon kelmasdi va tugma abadiy
       * "yuborilmoqda" holatida qolardi.
       */
      recorder.state === 'inactive'
        ? buildBlob()
        : await new Promise<Blob | null>((resolve) => {
            recorder.addEventListener('stop', () => resolve(buildBlob()), { once: true });
            recorder.stop();
          });

    release();
    setIsRecording(false);
    setSeconds(0);

    return blob ? { blob, seconds: Math.min(elapsed, MAX_VOICE_SECONDS) } : null;
  }, [release]);

  const cancel = useCallback(() => {
    isCancelledRef.current = true;

    if (recorderRef.current?.state !== 'inactive') {
      recorderRef.current?.stop();
    }

    chunksRef.current = [];
    release();
    setIsRecording(false);
    setSeconds(0);
  }, [release]);

  const clearError = useCallback(() => setError(null), []);

  return { isRecording, seconds, error, clearError, start, stop, cancel };
}
