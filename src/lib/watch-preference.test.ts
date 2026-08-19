// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  WATCH_SPEEDS,
  getWatchMuted,
  getWatchMutedOnServer,
  getWatchSpeed,
  getWatchSpeedOnServer,
  setWatchMuted,
  setWatchSpeed,
  subscribeWatchPreference,
} from '@/lib/watch-preference';

/**
 * Do'kon xotirada KESH saqlaydi — sinovlar orasida uni tozalash
 * kerak. Buning yagona yo'li: modulni qaytadan yuklash.
 */
async function freshModule() {
  vi.resetModules();

  return import('@/lib/watch-preference');
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('ovoz sozlamasi', () => {
  it("birinchi tashrifda O'CHIQ", async () => {
    /*
      Bu texnik talab, shunchaki afzallik emas: brauzerlar ovozli
      videoni o'zi ishga tushirishga ruxsat bermaydi. Yoqiq bo'lsa,
      video UMUMAN o'ynamasdi.
    */
    const store = await freshModule();

    expect(store.getWatchMuted()).toBe(true);
  });

  it('tanlov SAQLANADI', async () => {
    setWatchMuted(false);

    const store = await freshModule();

    expect(store.getWatchMuted()).toBe(false);
  });

  it("serverda har doim o'chiq", () => {
    // Serverda ovoz tushunchasi yo'q va mos kelmaslik chiqmasligi kerak.
    expect(getWatchMutedOnServer()).toBe(true);
  });

  it("o'zgarganda obunachilar xabar oladi", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeWatchPreference(listener);

    setWatchMuted(true);
    setWatchMuted(false);

    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setWatchMuted(true);

    // Obuna bekor qilingach xabar KELMASLIGI kerak.
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('tezlik sozlamasi', () => {
  it('odatiy tezlik — 1x', async () => {
    const store = await freshModule();

    expect(store.getWatchSpeed()).toBe(1);
    expect(getWatchSpeedOnServer()).toBe(1);
  });

  it('tanlov saqlanadi', async () => {
    setWatchSpeed(1.5);

    const store = await freshModule();

    expect(store.getWatchSpeed()).toBe(1.5);
  });

  it("ro'yxatda YO'Q tezlik rad etiladi", async () => {
    /*
      Saqlangan qiymatni odam qo'lda o'zgartira oladi. "0" tezlik
      videoni butunlay to'xtatib qo'yardi va odam buni tuzatishning
      yo'lini topa olmasdi.
    */
    setWatchSpeed(100);

    expect(getWatchSpeed()).toBe(1);

    window.localStorage.setItem('navix.watch.speed', '0');

    const store = await freshModule();

    expect(store.getWatchSpeed()).toBe(1);
  });

  it("buzuq qiymat ham 1x ga qaytadi", async () => {
    window.localStorage.setItem('navix.watch.speed', 'tez');

    const store = await freshModule();

    expect(store.getWatchSpeed()).toBe(1);
  });

  it("ro'yxatda 1x BOR va u birinchi", () => {
    /*
      Tugma ro'yxat bo'ylab aylanadi. 1x bo'lmasa, odam odatiy
      tezlikka qaytolmasdi.
    */
    expect(WATCH_SPEEDS[0]).toBe(1);
    expect(WATCH_SPEEDS.length).toBeGreaterThan(1);
  });

  it('barcha tezliklar musbat', () => {
    for (const speed of WATCH_SPEEDS) {
      expect(speed).toBeGreaterThan(0);
    }
  });
});
