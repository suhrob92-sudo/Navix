import { describe, expect, it } from 'vitest';

import {
  MIN_RESPONSE_SAMPLE,
  answerRateTone,
  formatAnswerRate,
  formatCount,
  formatResponseTime,
  formatShopAge,
  hoursBetween,
  median,
  responseTone,
} from '@/config/shop-stats';

/**
 * Sotuvchi ko'rsatkichlari — testlar.
 */

describe('median', () => {
  it("BO'SH ro'yxatda `null`", () => {
    /**
     * Nol qaytarish "bir zumda javob beradi" degan yolg'on ma'no
     * berardi.
     */
    expect(median([])).toBeNull();
  });

  it('toq sonli qatorda o\'rtadagisi', () => {
    expect(median([1, 5, 3])).toBe(3);
  });

  it("juft sonli qatorda ikkitasining o'rtachasi", () => {
    expect(median([1, 3, 5, 7])).toBe(4);
  });

  it('CHETDAGI qiymat natijani buzmaydi', () => {
    /**
     * Aynan shuning uchun median tanlangan: sotuvchi 10 ta savolga
     * tez javob berib, bittasini ta'tilda unutgan bo'lsa — oddiy
     * o'rtacha uni "sekin" deb ko'rsatardi.
     */
    const fast = [0.5, 0.6, 0.7, 0.8, 0.9];
    const withOutlier = [...fast, 720];

    const average = withOutlier.reduce((sum, value) => sum + value, 0) / withOutlier.length;

    expect(median(withOutlier)).toBeLessThan(2);
    expect(average).toBeGreaterThan(100);
  });

  it("kirish ro'yxati O'ZGARMAYDI", () => {
    // Chaqiruvchi uni boshqa joyda ishlatayotgan bo'lishi mumkin.
    const values = [5, 1, 3];

    median(values);

    expect(values).toEqual([5, 1, 3]);
  });
});

describe('vaqt farqi', () => {
  it('soatda hisoblanadi', () => {
    const from = new Date('2026-08-24T10:00:00Z');
    const to = new Date('2026-08-24T13:30:00Z');

    expect(hoursBetween(from, to)).toBe(3.5);
  });

  it('MANFIY farq nolga tenglashtiriladi', () => {
    /**
     * Javob savoldan oldin yozilishi mumkin emas, lekin serverlar
     * vaqti bir zumda mos kelmasligi mumkin.
     */
    const from = new Date('2026-08-24T13:00:00Z');
    const to = new Date('2026-08-24T12:00:00Z');

    expect(hoursBetween(from, to)).toBe(0);
  });
});

describe('javob tezligi matni', () => {
  it('bir soatdan tez', () => {
    expect(formatResponseTime(0.4)).toBe('bir soat ichida');
  });

  it('soatlarda', () => {
    expect(formatResponseTime(3.4)).toBe('3 soat ichida');
  });

  it('kunlarda', () => {
    expect(formatResponseTime(50)).toBe('2 kun ichida');
  });
});

describe('javob tezligining ohangi', () => {
  it('tez javob — yaxshi', () => {
    expect(responseTone(1)).toBe('good');
    expect(responseTone(4)).toBe('good');
  });

  it("o'rtacha javob — oddiy", () => {
    expect(responseTone(10)).toBe('normal');
  });

  it('ikki kundan sekin — yomon', () => {
    expect(responseTone(48)).toBe('weak');
    expect(responseTone(100)).toBe('weak');
  });
});

describe("do'kon yoshi", () => {
  it('bugun ochilgan', () => {
    expect(formatShopAge(0)).toBe('bugun ochilgan');
  });

  it('kunlarda', () => {
    expect(formatShopAge(12)).toBe('12 kun');
  });

  it('oylarda', () => {
    expect(formatShopAge(95)).toBe('3 oy');
  });

  it('yillarda', () => {
    expect(formatShopAge(800)).toBe('2 yil');
  });
});

describe('javob berish ulushi', () => {
  it('savol berilmaganda shunday deyiladi', () => {
    expect(formatAnswerRate({ askedCount: 0, answeredCount: 0, medianHours: null })).toBe(
      'Savol berilmagan',
    );
  });

  it('ANIQ sonlar yoziladi, foiz emas', () => {
    /**
     * "90%" katta ko'rinadi, lekin u ikkita savolga asoslangan
     * bo'lishi mumkin. Aniq sonlar odamga o'zi xulosa chiqarish
     * imkonini beradi.
     */
    expect(formatAnswerRate({ askedCount: 20, answeredCount: 18, medianHours: 2 })).toBe(
      '20 savoldan 18 tasiga javob bergan',
    );
  });

  it("SAVOL KAM bo'lganda ohang oddiy qoladi", () => {
    /**
     * Ikkita savoldan bittasiga javob bermagani "yomon sotuvchi"
     * degani emas — bu shunchaki yetarli ma'lumot emas.
     */
    expect(
      answerRateTone({ askedCount: MIN_RESPONSE_SAMPLE - 1, answeredCount: 0, medianHours: null }),
    ).toBe('normal');
  });

  it("ko'p javob bergan — yaxshi", () => {
    expect(answerRateTone({ askedCount: 10, answeredCount: 9, medianHours: 1 })).toBe('good');
  });

  it('kam javob bergan — yomon', () => {
    expect(answerRateTone({ askedCount: 10, answeredCount: 2, medianHours: 1 })).toBe('weak');
  });
});

describe('sonni yozish', () => {
  it("uch xonagacha bo'shliqsiz", () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
  });

  it("uchtalab BO'SHLIQ qo'yiladi", () => {
    expect(formatCount(1_000)).toBe('1 000');
    expect(formatCount(12_500)).toBe('12 500');
    expect(formatCount(1_234_567)).toBe('1 234 567');
  });

  it('manfiy son nolga aylanadi', () => {
    expect(formatCount(-5)).toBe('0');
  });
});
