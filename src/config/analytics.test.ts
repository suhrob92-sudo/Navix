import { describe, expect, it } from 'vitest';

import {
  ANALYTICS_PERIODS,
  ANALYTICS_PERIOD_LABELS,
  DEFAULT_ANALYTICS_PERIOD,
  changePercent,
  chartMax,
  isAnalyticsPeriod,
} from '@/config/analytics';

/**
 * O'sish ko'rsatkichlari.
 *
 * Bu sonlar blogerning qaroriga ta'sir qiladi: "davom etaymi yoki
 * yo'q?". Noto'g'ri hisoblangan foiz uni noto'g'ri qarorga olib
 * kelardi — shuning uchun chegaraviy holatlar batafsil tekshiriladi.
 */
describe('changePercent', () => {
  it('oddiy o\'sishni hisoblaydi', () => {
    expect(changePercent(12, 8)).toBe(50);
  });

  it('pasayishni MANFIY qaytaradi', () => {
    /*
      Pasayishni yashirish yoki nol qilib ko'rsatish blogerni
      chalg'itardi: u muammoni sezmasdan davom etardi.
    */
    expect(changePercent(6, 12)).toBe(-50);
  });

  it("o'zgarish bo'lmasa nol", () => {
    expect(changePercent(10, 10)).toBe(0);
  });

  it('oldingi davr NOL bo\'lsa `null` qaytadi', () => {
    /*
      Noldan birga o'sish matematik jihatdan cheksiz foiz.
      "+100%" ko'rsatish yolg'on bo'lardi: birinchi obunachi
      paydo bo'lgani "ikki barobar o'sish" emas.
    */
    expect(changePercent(1, 0)).toBeNull();
    expect(changePercent(0, 0)).toBeNull();
  });

  it('butun songa yaxlitlanadi', () => {
    // "+33.333333%" ekranda hech kimga kerak emas.
    expect(changePercent(4, 3)).toBe(33);
  });
});

describe('ANALYTICS_PERIODS', () => {
  it('odatiy davr ro\'yxatda bor', () => {
    /*
      Odatiy qiymat ro'yxatdan tushib qolsa, sahifa ochilganda
      server 400 qaytarardi va panel hech qachon ko'rinmasdi.
    */
    expect(ANALYTICS_PERIODS).toContain(DEFAULT_ANALYTICS_PERIOD);
  });

  it('HAR BIR davr uchun yozuv bor', () => {
    for (const period of ANALYTICS_PERIODS) {
      expect(ANALYTICS_PERIOD_LABELS[period]).toBeTruthy();
    }
  });

  it('davrlar o\'sish tartibida', () => {
    // Ekrandagi tugmalar shu tartibda chiziladi — aralashib ketmasin.
    const sorted = [...ANALYTICS_PERIODS].sort((a, b) => a - b);

    expect([...ANALYTICS_PERIODS]).toEqual(sorted);
  });

  it("eng uzun davr bir yildan kam", () => {
    /*
      Chegarasiz davr serverga o'n yillik hodisalarni o'qishga
      buyruq berardi.
    */
    expect(Math.max(...ANALYTICS_PERIODS)).toBeLessThan(365);
  });
});

describe('isAnalyticsPeriod', () => {
  it('ro\'yxatdagini qabul, boshqasini rad etadi', () => {
    expect(isAnalyticsPeriod(7)).toBe(true);
    expect(isAnalyticsPeriod(3650)).toBe(false);
    expect(isAnalyticsPeriod(0)).toBe(false);
    expect(isAnalyticsPeriod(-7)).toBe(false);
  });
});

describe('chartMax', () => {
  it('eng katta qiymatni qaytaradi', () => {
    expect(chartMax([3, 9, 1])).toBe(9);
  });

  it("hammasi nol bo'lsa ham nolga bo'linmaydi", () => {
    /*
      Diagramma balandligi `qiymat / max` bilan hisoblanadi.
      `max` nol bo'lsa, natija `NaN` bo'lib ustunchalar umuman
      chizilmasdi.
    */
    expect(chartMax([0, 0, 0])).toBe(1);
    expect(chartMax([])).toBe(1);
  });
});
