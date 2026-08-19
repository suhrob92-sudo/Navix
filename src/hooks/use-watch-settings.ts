'use client';

import { useCallback, useSyncExternalStore } from 'react';

import {
  getWatchMuted,
  getWatchMutedOnServer,
  getWatchSpeed,
  getWatchSpeedOnServer,
  setWatchMuted,
  setWatchSpeed,
  subscribeWatchPreference,
} from '@/lib/watch-preference';

export interface WatchSettings {
  isMuted: boolean;
  toggleMuted: () => void;
  speed: number;
  setSpeed: (value: number) => void;
}

/**
 * Tomosha sozlamalari — eslab qolinadigan ovoz va tezlik.
 *
 * ── Nima uchun hook ───────────────────────────────────────────────────
 * Sozlama ikki joyda kerak: tomosha sahifasi (`isMuted` ni pleyerga
 * uzatadi) va pleyerning o'zi (tezlik tugmasi). Har birida
 * `localStorage` ni qo'lda o'qisa, ular bir-biridan ajralib
 * ketardi: bir joyda o'zgargan qiymat ikkinchisida eskicha
 * qolardi.
 */
export function useWatchSettings(): WatchSettings {
  const isMuted = useSyncExternalStore(
    subscribeWatchPreference,
    getWatchMuted,
    getWatchMutedOnServer,
  );

  const speed = useSyncExternalStore(
    subscribeWatchPreference,
    getWatchSpeed,
    getWatchSpeedOnServer,
  );

  const toggleMuted = useCallback(() => {
    /*
      Hozirgi qiymat DO'KONDAN o'qiladi.

      `!isMuted` yozilsa, u qayta chizish paytidagi eski qiymatga
      tayanardi: tez ketma-ket ikki bosishda tugma o'z holiga
      qaytib qolardi.
    */
    setWatchMuted(!getWatchMuted());
  }, []);

  return { isMuted, toggleMuted, speed, setSpeed: setWatchSpeed };
}
