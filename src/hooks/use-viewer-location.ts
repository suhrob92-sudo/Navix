'use client';

import { useCallback, useState } from 'react';

export interface ViewerPoint {
  latitude: number;
  longitude: number;
}

export type LocationStatus = 'IDLE' | 'ASKING' | 'READY' | 'DENIED' | 'FAILED';

export interface ViewerLocationState {
  point: ViewerPoint | null;
  status: LocationStatus;
  error: string | null;
  /** Brauzerdan joylashuv so'raydi. */
  request: () => void;
}

/** Telefon javobini qancha kutamiz. */
const TIMEOUT_MS = 12_000;

/**
 * Bir sessiya ichida takroran so'ralmasin.
 *
 * ── Nima uchun `sessionStorage`, `localStorage` emas ──────────────────
 * Joylashuv o'zgaradi: odam uydan ishga borsa, kechagi nuqta noto'g'ri
 * javob berardi. `sessionStorage` esa yorliq yopilishi bilan
 * tozalanadi — ya'ni "bugungi seans" uchun eslab qoladi, abadiy emas.
 *
 * ── Nima uchun SERVERGA yozilmaydi ────────────────────────────────────
 * Odamning hozirgi joyi — eng nozik ma'lumotlardan biri. Bazaga
 * yozilsa, u yerda abadiy qolardi va "kim qayerda yurgani" tarixga
 * aylanardi. Bizga esa u faqat bitta so'rov davomida kerak.
 */
const STORAGE_KEY = 'navix:viewer-point';

function readCached(): ViewerPoint | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ViewerPoint>;

    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') return null;

    return { latitude: parsed.latitude, longitude: parsed.longitude };
  } catch {
    return null;
  }
}

/**
 * Ko'ruvchining joylashuvi — "Yaqin atrofda" uchun.
 *
 * ── Nima uchun O'ZI so'ramaydi ────────────────────────────────────────
 * Sahifa ochilishi bilan joylashuv so'ralsa, brauzer darhol ruxsat
 * oynasini chiqaradi. Odam nima uchun so'ralayotganini bilmaydi va
 * ko'pincha "rad etish" ni bosadi — keyin uni qaytarish qiyin.
 *
 * Shuning uchun so'rov faqat odam "Yaqin atrofda" ni tanlaganda,
 * ya'ni NIMA UCHUN kerakligi aniq bo'lganda yuboriladi.
 */
export function useViewerLocation(): ViewerLocationState {
  const [point, setPoint] = useState<ViewerPoint | null>(() => readCached());
  const [status, setStatus] = useState<LocationStatus>(() => (readCached() ? 'READY' : 'IDLE'));
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('FAILED');
      setError("Bu brauzer joylashuvni qo'llab-quvvatlamaydi.");

      return;
    }

    setStatus('ASKING');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setPoint(next);
        setStatus('READY');

        try {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Xotira to'lgan yoki taqiqlangan — eslab qolmasak ham ishlaydi.
        }
      },
      (caught) => {
        if (caught.code === caught.PERMISSION_DENIED) {
          setStatus('DENIED');
          setError("Joylashuvga ruxsat berilmadi.");

          return;
        }

        setStatus('FAILED');
        setError("Joylashuvni aniqlab bo'lmadi. Internet yoki GPS yoqilganini tekshiring.");
      },
      /**
       * Yuqori aniqlik SO'RALMAYDI.
       *
       * Bizga 50 kilometrlik oraliq kerak — bir necha metr aniqlik
       * ortiqcha. Yuqori aniqlik esa GPS'ni yoqib, batareyani
       * sarflaydi va javobni sekinlashtiradi.
       */
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: 5 * 60_000 },
    );
  }, []);

  return { point, status, error, request };
}
