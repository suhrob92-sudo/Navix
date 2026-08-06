'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { SPEECH_LANGUAGES, isUsableTranscript, speechErrorMessage } from '@/lib/voice';

/**
 * Mikrofon orqali nutqni matnga o'giradi.
 *
 * ── Nima uchun brauzer API'si ─────────────────────────────────────────
 * Brauzerda bepul `SpeechRecognition` bor va u kalitsiz ishlaydi.
 * Pullik xizmat (Yandex SpeechKit, Google Cloud) aniqroq, lekin karta
 * va oylik to'lov talab qiladi. Loyihaning hozirgi bosqichida bu
 * ortiqcha xarajat.
 *
 * Almashtirish oson bo'lishi uchun butun brauzer bilan muloqot SHU
 * FAYLDA saqlanadi: interfeys `{ isListening, start, stop }` dan
 * iborat va u o'zgarmaydi.
 *
 * ── Nima uchun til ro'yxati ───────────────────────────────────────────
 * `uz-UZ` ni hamma qurilma bilmaydi. Tanigich "language-not-supported"
 * xatosini bersa, keyingi tilga o'tamiz (`SPEECH_LANGUAGES`). Bu
 * jimgina bo'ladi — foydalanuvchi faqat natijani ko'radi.
 *
 * ── XAVFSIZLIK ────────────────────────────────────────────────────────
 * Bu hook HECH QACHON o'zi amal bajarmaydi. U faqat matn qaytaradi;
 * matn kiritish maydoniga tushadi va foydalanuvchi uni ko'rib,
 * tugmani o'zi bosadi. "Ellik ming" o'rniga "besh yuz ming" eshitilsa,
 * xato pul harakatiga aylanmaydi.
 */

/**
 * Brauzerdagi tanigich turlari.
 *
 * `lib.dom` da ular yo'q (standart hali tugallanmagan), shuning uchun
 * kerakli qismini o'zimiz e'lon qilamiz — `any` ishlatmaslik uchun.
 */
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechWindow {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
}

function getConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;

  const candidate = window as unknown as SpeechWindow;

  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export interface SpeechRecognitionState {
  /** Brauzer nutqni tanishni umuman qo'llab-quvvatlaydimi. */
  isSupported: boolean;
  /** Hozir mikrofon ochiqmi. */
  isListening: boolean;
  /** Gapirilayotgan paytdagi oraliq matn — ekranda "jonli" ko'rinadi. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  clearError: () => void;
}

export interface UseSpeechRecognitionOptions {
  /** Yakuniy matn tayyor bo'lganda chaqiriladi. */
  onResult: (text: string) => void;
}

/**
 * Qo'llab-quvvatlash — TASHQI holat.
 *
 * `useEffect` + `setState` bilan o'qilsa React ortiqcha render qiladi
 * va serverdagi birinchi render brauzernikiga mos kelmaydi.
 * `useSyncExternalStore` aynan shu holat uchun yaratilgan.
 */
const NO_CHANGES = () => () => {};

export function useSpeechRecognition({ onResult }: UseSpeechRecognitionOptions): SpeechRecognitionState {
  const isSupported = useSyncExternalStore(NO_CHANGES, () => getConstructor() !== null, () => false);

  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const languageIndexRef = useRef(0);

  /**
   * `onResult` ni ref'da saqlaymiz.
   *
   * Aks holda har render'da tanigichni qayta yaratishga to'g'ri
   * kelardi va gapirish o'rtasida u uzilib qolardi.
   *
   * Yozish EFFEKT ichida: render paytida ref'ga tegish React'ning
   * qoidasini buzadi (bir xil render ikki xil natija berishi mumkin).
   */
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    // Sahifadan chiqilganda mikrofon albatta yopilsin.
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterim('');
  }, []);

  /**
   * `start` o'zini QAYTA chaqiradi (til almashganda).
   *
   * To'g'ridan-to'g'ri chaqirib bo'lmaydi: `useCallback` hali
   * e'lon qilinmagan bo'ladi. Shuning uchun oxirgi nusxa ref'da
   * saqlanadi.
   */
  const startRef = useRef<() => void>(() => {});

  const start = useCallback(() => {
    const Recognition = getConstructor();

    if (!Recognition) {
      setError("Bu brauzer ovozni tanimaydi. Xabarni matn bilan yozing.");
      return;
    }

    // Avvalgi seans yopilmagan bo'lsa — yopamiz.
    recognitionRef.current?.abort();

    const recognition = new Recognition();

    recognition.lang = SPEECH_LANGUAGES[languageIndexRef.current] ?? SPEECH_LANGUAGES[0];
    // Bitta buyruq — bitta gap. Uzluksiz tinglash batareyani yeydi.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      let confidence: number | null = null;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternative = result[0];

        if (result.isFinal) {
          finalText += alternative.transcript;
          confidence = Number.isFinite(alternative.confidence) ? alternative.confidence : null;
        } else {
          interimText += alternative.transcript;
        }
      }

      setInterim(interimText);

      if (finalText.trim().length === 0) return;

      if (!isUsableTranscript(finalText, confidence)) {
        setError("Aniq eshitilmadi. Qaytadan urinib ko'ring.");
        return;
      }

      onResultRef.current(finalText.trim());
    };

    recognition.onerror = (event) => {
      /**
       * Til qo'llab-quvvatlanmasa — keyingisiga o'tamiz.
       *
       * Bu xato O'ZBEK tilida eng ko'p uchraydi: qurilmada uz-UZ
       * bo'lmasligi mumkin. Foydalanuvchiga xato ko'rsatib
       * qo'rqitmaymiz, jimgina rus tiliga o'tib qayta urinamiz.
       */
      if (event.error === 'language-not-supported' && languageIndexRef.current < SPEECH_LANGUAGES.length - 1) {
        languageIndexRef.current += 1;
        setIsListening(false);
        startRef.current();

        return;
      }

      // "Gapirmadi" — xato emas, shunchaki jimlik.
      if (event.error === 'aborted') {
        setIsListening(false);
        return;
      }

      setError(speechErrorMessage(event.error));
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;
    setError(null);
    setInterim('');

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // Ikki marta tez bosilganda brauzer xato beradi — bu jiddiy emas.
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  const clearError = useCallback(() => setError(null), []);

  return { isSupported, isListening, interim, error, start, stop, clearError };
}
