'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Teskari sanoq (countdown) hisoblagichi.
 *
 * "Kodni qayta yuborish 47 soniyadan keyin" kabi holatlar uchun.
 * Vaqt tugaganda `secondsLeft` nolga tushadi.
 */
export function useCountdown(initialSeconds = 0) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /** Sanoqni berilgan soniyadan boshlaydi. */
  const start = useCallback(
    (seconds: number) => {
      clear();
      setSecondsLeft(Math.max(0, Math.floor(seconds)));
    },
    [clear],
  );

  useEffect(() => {
    if (secondsLeft <= 0) {
      clear();
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return clear;
  }, [secondsLeft, clear]);

  return { secondsLeft, isRunning: secondsLeft > 0, start };
}
