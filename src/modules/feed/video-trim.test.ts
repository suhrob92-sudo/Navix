import { describe, expect, it } from 'vitest';

import {
  COVER_FRAME_COUNT,
  MIN_TRIM_SECONDS,
  clampTrim,
  coverFrameTimes,
  isInsideTrim,
  isValidTrim,
  readTrim,
  trimmedSeconds,
} from '@/modules/feed/video-trim';
import { MAX_VIDEO_SECONDS } from '@/modules/upload/upload.types';

/**
 * Kesish — uch joyda ishlatiladigan hisob.
 *
 * Muharrir ekrani, server tekshiruvi va pleyer AYNAN shu
 * funksiyalarga tayanadi. Bittasi buzilsa, ekranda "0:12" ko'rinib,
 * video 40 soniya o'ynardi — bunday xatoni ko'z bilan payqash
 * deyarli imkonsiz.
 */
describe('clampTrim', () => {
  it('normal oraliqni o\'zgartirmaydi', () => {
    expect(clampTrim(2, 8, 20)).toEqual({ start: 2, end: 8 });
  });

  it('chegaradan chiqqan qiymatni QAYTARADI', () => {
    expect(clampTrim(-5, 100, 20)).toEqual({ start: 0, end: 20 });
  });

  it('juda qisqa oraliqda OXIRINI suradi', () => {
    /*
      Odam odatda oxirgi surgichni ushlab turgan bo'ladi. Uning
      ostidagi qiymatni o'zgartirish barmoq bilan kurashishga
      o'xshardi — shuning uchun boshi joyida qoladi.
    */
    const result = clampTrim(5, 5.2, 20);

    expect(result.start).toBe(5);
    expect(result.end).toBe(5 + MIN_TRIM_SECONDS);
  });

  it('oxiriga tirab qo\'yilganda BOSHINI orqaga suradi', () => {
    const result = clampTrim(19.9, 20, 20);

    expect(result.end).toBe(20);
    expect(result.start).toBe(20 - MIN_TRIM_SECONDS);
  });

  it('teskari oraliqni to\'g\'rilaydi', () => {
    const result = clampTrim(10, 3, 20);

    expect(result.end - result.start).toBeGreaterThanOrEqual(MIN_TRIM_SECONDS);
  });

  it('juda qisqa videoda butun uzunlikni qaytaradi', () => {
    expect(clampTrim(0, 0.4, 0.4)).toEqual({ start: 0, end: 0.4 });
  });

  it('buzuq davomiylikda YIQILMAYDI', () => {
    /*
      Ba'zi fayllarda brauzer `Infinity` yoki `NaN` qaytaradi (oqim
      sifatida yozilgan video). Hisoblashga urinish `NaN` ni butun
      ekran bo'ylab tarqatardi.
    */
    expect(clampTrim(0, 10, Number.POSITIVE_INFINITY)).toEqual({ start: 0, end: 0 });
    expect(clampTrim(0, 10, Number.NaN)).toEqual({ start: 0, end: 0 });
    expect(clampTrim(Number.NaN, Number.NaN, 20).end).toBe(20);
  });

  it('natija HAR DOIM ishlaydigan oraliq', () => {
    // Surgich harakatlanayotganda har xil holat kelib chiqadi.
    const cases: [number, number, number][] = [
      [0, 0, 30],
      [30, 0, 30],
      [15, 15, 30],
      [-100, -50, 30],
      [29.99, 30, 30],
    ];

    for (const [start, end, duration] of cases) {
      const result = clampTrim(start, end, duration);

      expect(result.start).toBeGreaterThanOrEqual(0);
      expect(result.end).toBeLessThanOrEqual(duration);
      expect(result.end - result.start).toBeGreaterThanOrEqual(MIN_TRIM_SECONDS - 0.001);
    }
  });
});

describe('trimmedSeconds', () => {
  it('YUQORIGA yaxlitlaydi', () => {
    /*
      11.2 soniyalik video "0:11" deb yozilsa, oxirgi kadr
      sanoqdan tashqarida qolardi.
    */
    expect(trimmedSeconds({ start: 0, end: 11.2 })).toBe(12);
  });

  it('eng kichik uzunlikdan past tushmaydi', () => {
    expect(trimmedSeconds({ start: 5, end: 5 })).toBe(MIN_TRIM_SECONDS);
  });
});

describe('isValidTrim', () => {
  it('to\'g\'ri oraliqni qabul qiladi', () => {
    expect(isValidTrim(2, 10)).toBe(true);
  });

  it('juda qisqa oraliqni RAD etadi', () => {
    expect(isValidTrim(5, 5.5)).toBe(false);
  });

  it('teskari oraliqni rad etadi', () => {
    expect(isValidTrim(10, 2)).toBe(false);
  });

  it('manfiy boshlanishni rad etadi', () => {
    expect(isValidTrim(-1, 10)).toBe(false);
  });

  it('yuklash chegarasidan uzunni rad etadi', () => {
    expect(isValidTrim(0, MAX_VIDEO_SECONDS)).toBe(true);
    expect(isValidTrim(0, MAX_VIDEO_SECONDS + 1)).toBe(false);
  });

  it('son bo\'lmagan qiymatni rad etadi', () => {
    expect(isValidTrim(Number.NaN, 10)).toBe(false);
    expect(isValidTrim(0, Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('coverFrameTimes', () => {
  it('so\'ralgan sondagi kadr qaytaradi', () => {
    expect(coverFrameTimes({ start: 0, end: 12 })).toHaveLength(COVER_FRAME_COUNT);
  });

  it('kadrlar oraliq ICHIDA qoladi', () => {
    const times = coverFrameTimes({ start: 4, end: 10 });

    for (const time of times) {
      expect(time).toBeGreaterThan(4);
      expect(time).toBeLessThan(10);
    }
  });

  it('chekkalarga TEGMAYDI', () => {
    /*
      Aynan boshlanish kadri ko'pincha qorong'i bo'ladi (video
      ochilishi) va oxirgisi ham. Ular muqova sifatida eng yomon
      tanlov bo'lardi.
    */
    const times = coverFrameTimes({ start: 0, end: 6 }, 6);

    expect(times[0]).toBeGreaterThan(0);
    expect(times[times.length - 1]).toBeLessThan(6);
  });

  it('kadrlar o\'sish tartibida va TAKRORLANMAYDI', () => {
    const times = coverFrameTimes({ start: 1, end: 13 }, 6);

    expect(new Set(times).size).toBe(times.length);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('bo\'sh oraliqda ham yiqilmaydi', () => {
    expect(coverFrameTimes({ start: 5, end: 5 })).toEqual([5]);
  });
});

describe('isInsideTrim', () => {
  it('oraliq ichidagi vaqtni tan oladi', () => {
    expect(isInsideTrim(5, { start: 2, end: 10 })).toBe(true);
  });

  it('chegaradan tashqarini rad etadi', () => {
    expect(isInsideTrim(1, { start: 2, end: 10 })).toBe(false);
    expect(isInsideTrim(11, { start: 2, end: 10 })).toBe(false);
  });
});

describe('readTrim', () => {
  it('to\'liq kesimni o\'qiydi', () => {
    expect(readTrim({ videoStartSeconds: 2, videoEndSeconds: 9 })).toEqual({ start: 2, end: 9 });
  });

  it('ESKI postda `null` — video butunlay o\'ynaydi', () => {
    /*
      Kesish qo'shilishidan oldin joylangan videolarda bu maydonlar
      bo'sh. Ularni buzish mumkin emas.
    */
    expect(readTrim({ videoStartSeconds: null, videoEndSeconds: null })).toBeNull();
  });

  it('YARIM ma\'lumotni kesilmagan deb qaraydi', () => {
    // Yarim ma'lumot bilan pleyer qayerda to'xtashini bilmasdi.
    expect(readTrim({ videoStartSeconds: 3, videoEndSeconds: null })).toBeNull();
    expect(readTrim({ videoStartSeconds: null, videoEndSeconds: 9 })).toBeNull();
  });

  it('BUZUQ kesimni ham kesilmagan deb qaraydi', () => {
    /*
      Baza bevosita tahrirlangan yoki eski xatolik qolgan bo'lishi
      mumkin. Bunday holda video butunlay o'ynagani — pleyerning
      qotib qolishidan yaxshiroq.
    */
    expect(readTrim({ videoStartSeconds: 10, videoEndSeconds: 2 })).toBeNull();
    expect(readTrim({ videoStartSeconds: 5, videoEndSeconds: 5.2 })).toBeNull();
  });
});
