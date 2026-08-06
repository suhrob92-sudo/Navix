'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { SPEECH_LANGUAGES } from '@/lib/voice';
import {
  getVoicePreference,
  getVoicePreferenceOnServer,
  setVoicePreference,
  subscribeVoicePreference,
} from '@/lib/voice-preference';

/**
 * Yordamchining javobini OVOZ bilan o'qiydi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Ovoz bilan buyruq berayotgan odam ko'pincha qo'li band bo'ladi:
 * mashinada, oshxonada, yo'lda. Javobni o'qish uchun ekranga qarash
 * kerak bo'lsa, ovoz bilan boshqarishning yarim foydasi yo'qoladi.
 *
 * ── Nima uchun ixtiyoriy ──────────────────────────────────────────────
 * Ko'p qurilmada o'zbekcha ovoz yo'q va matn ruscha yoki inglizcha
 * talaffuz bilan o'qiladi — bu quloqqa yoqimsiz. Shuning uchun kalit
 * SUKUT BO'YICHA O'CHIQ va foydalanuvchi uni o'zi yoqadi.
 *
 * Tanlov brauzerda saqlanadi: har safar qayta yoqish zerikarli.
 */

/** O'qish tezligi — sekinroq, chunki summalar aniq eshitilishi kerak. */
const SPEECH_RATE = 0.95;

export interface SpeechSynthesisState {
  isSupported: boolean;
  /** Ovozli javob yoqilganmi. */
  isEnabled: boolean;
  isSpeaking: boolean;
  toggle: () => void;
  speak: (text: string) => void;
  cancel: () => void;
}

/**
 * Matndan ovozga mos ko'rinish yasaydi.
 *
 * Ro'yxat belgilari ("•") va qavslar ovozda ma'nosiz — ular o'qilsa
 * "nuqta nuqta" bo'lib eshitiladi. Yangi qator esa qisqa pauzaga
 * aylantiriladi.
 */
function toSpokenText(text: string): string {
  return text
    .replace(/[•·]/g, ' ')
    .replace(/\n+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Qurilmadagi eng mos ovozni tanlaydi. */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const language of SPEECH_LANGUAGES) {
    const exact = voices.find((voice) => voice.lang === language);
    if (exact) return exact;

    // "uz-UZ" topilmasa "uz" bilan boshlanadiganini olamiz.
    const prefix = language.split('-')[0];
    const partial = voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix));
    if (partial) return partial;
  }

  return null;
}

/** Brauzer ovozli o'qishni qo'llab-quvvatlaydimi. */
function isSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Qo'llab-quvvatlash — TASHQI holat.
 *
 * `useState` + `useEffect` bilan o'qilsa, serverdagi va brauzerdagi
 * birinchi render mos kelmaydi. `useSyncExternalStore` esa aynan shu
 * holat uchun: serverga `false`, brauzerga haqiqiy javob beriladi.
 */
const NO_CHANGES = () => () => {};

export function useSpeechSynthesis(): SpeechSynthesisState {
  const isSupported = useSyncExternalStore(NO_CHANGES, isSynthesisSupported, () => false);
  const isEnabled = useSyncExternalStore(
    subscribeVoicePreference,
    getVoicePreference,
    getVoicePreferenceOnServer,
  );

  const [isSpeaking, setIsSpeaking] = useState(false);

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!isSynthesisSupported()) return;

    /**
     * Ovozlar ro'yxati ASINXRON yuklanadi.
     *
     * Chrome birinchi chaqiruvda bo'sh ro'yxat qaytaradi va keyin
     * `voiceschanged` hodisasini yuboradi. Shuning uchun ikkala
     * yo'ldan ham o'qiymiz.
     */
    function loadVoices() {
      voiceRef.current = pickVoice(window.speechSynthesis.getVoices());
    }

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggle = useCallback(() => {
    const next = !getVoicePreference();

    setVoicePreference(next);
    if (!next) window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isEnabled || !isSynthesisSupported()) return;

      // Oldingi javob hali o'qilayotgan bo'lsa — to'xtatamiz.
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(toSpokenText(text));

      utterance.rate = SPEECH_RATE;
      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
        utterance.lang = voiceRef.current.lang;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [isEnabled],
  );

  return { isSupported, isEnabled, isSpeaking, toggle, speak, cancel };
}
