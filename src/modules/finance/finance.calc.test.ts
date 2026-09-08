import { describe, expect, it } from 'vitest';

import { MAX_CHART_SLICES } from '@/config/finance';
import {
  changePercent,
  isValidMonth,
  monthKey,
  monthRange,
  previousMonth,
  summarizeMonth,
  type FinanceRow,
} from '@/modules/finance/finance.calc';

/**
 * Hisob-kitob — modulning eng nozik joyi.
 *
 * Bu yerdagi xato har oyda takrorlanadi va uni sezish qiyin:
 * 18 660 o'rniga 18 000 chiqsa, hech kim darrov bilmaydi.
 */

const out = (module: string, amount: number): FinanceRow => ({
  direction: 'OUT',
  type: 'PAYMENT',
  sourceModule: module,
  amountTiyin: amount,
});

const inflow = (type: string, amount: number, module = 'wallet'): FinanceRow => ({
  direction: 'IN',
  type,
  sourceModule: module,
  amountTiyin: amount,
});

describe('summarizeMonth', () => {
  it('chiqimlarni qo\'shadi va toifalarga ajratadi', () => {
    const result = summarizeMonth('2026-09', [out('food', 5_000_00), out('taxi', 18_660_00)]);

    expect(result.spentTiyin).toBe(23_660_00);
    expect(result.categories).toHaveLength(2);
    /* Kattadan kichikka. */
    expect(result.categories[0].code).toBe('taxi');
    expect(result.categories[1].code).toBe('food');
  });

  it('bir toifadagi bir necha amalni birlashtiradi', () => {
    const result = summarizeMonth('2026-09', [out('food', 10_000), out('food', 15_000)]);

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].amountTiyin).toBe(25_000);
    expect(result.categories[0].count).toBe(2);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Qaytarilgan pul TUSHUM emas. Uni tushum deb sanasak, odam
   * ishlamagan pulni daromad deb ko'rardi.
   */
  it('qaytarilgan pulni tushum deb sanamaydi', () => {
    const result = summarizeMonth('2026-09', [
      out('taxi', 18_660_00),
      inflow('REFUND', 18_660_00, 'taxi'),
    ]);

    expect(result.refundedTiyin).toBe(18_660_00);
    expect(result.receivedTiyin).toBe(0);
    expect(result.netTiyin).toBe(0);
  });

  it("to'ldirish va daromadni tushum deb sanaydi", () => {
    const result = summarizeMonth('2026-09', [
      inflow('TOP_UP', 500_000_00),
      inflow('EARNING', 14_928_00, 'taxi'),
      inflow('BONUS', 5_000_00),
    ]);

    expect(result.receivedTiyin).toBe(519_928_00);
    expect(result.refundedTiyin).toBe(0);
    expect(result.spentTiyin).toBe(0);
  });

  /**
   * Sof xarajat MANFIY bo'lmaydi.
   *
   * O'tgan oydagi xariddan qaytgan pul bu oyda ko'p bo'lishi mumkin.
   * "Bu oyda -50 000 so'm sarfladingiz" hech qanday ma'no bermaydi.
   */
  it("sof xarajat manfiy bo'lmaydi", () => {
    const result = summarizeMonth('2026-09', [
      out('food', 10_000),
      inflow('REFUND', 90_000, 'food'),
    ]);

    expect(result.netTiyin).toBe(0);
    /* Yalpi chiqim esa o'zgarmaydi — u haqiqatan bo'lgan. */
    expect(result.spentTiyin).toBe(10_000);
  });

  it('foizlar jami 100 ga yaqin', () => {
    const result = summarizeMonth('2026-09', [
      out('food', 50_000),
      out('taxi', 30_000),
      out('market', 20_000),
    ]);

    const sum = result.categories.reduce((total, slice) => total + slice.percent, 0);

    expect(sum).toBeGreaterThan(99.5);
    expect(sum).toBeLessThan(100.5);
  });

  /**
   * Kichik toifalar "Boshqa" ga yig'iladi, lekin JAMI yo'qolmaydi.
   *
   * Agar yig'ish noto'g'ri bo'lsa, bo'laklar yig'indisi umumiy
   * summadan kam chiqardi va odam buni darhol sezardi.
   */
  it("ortiqcha toifalarni 'Boshqa' ga yig'adi va jami saqlanadi", () => {
    const rows = ['food', 'taxi', 'market', 'hotel', 'travel', 'jobs', 'live', 'call'].map(
      (name, index) => out(name, (10 - index) * 1_000),
    );

    const result = summarizeMonth('2026-09', rows);

    expect(result.categories).toHaveLength(MAX_CHART_SLICES + 1);
    expect(result.categories[result.categories.length - 1].code).toBe('other');

    const total = result.categories.reduce((sum, slice) => sum + slice.amountTiyin, 0);

    expect(total).toBe(result.spentTiyin);
  });

  it("noma'lum modulni yo'qotmaydi", () => {
    const result = summarizeMonth('2026-09', [out('yangi-modul', 7_000)]);

    expect(result.spentTiyin).toBe(7_000);
    expect(result.categories[0].label).toBe('Boshqa');
  });

  it("bo'sh oyda hamma narsa nol", () => {
    const result = summarizeMonth('2026-09', []);

    expect(result.spentTiyin).toBe(0);
    expect(result.netTiyin).toBe(0);
    expect(result.categories).toEqual([]);
    expect(result.transactionCount).toBe(0);
  });
});

describe('oy hisobi', () => {
  it('sanadan oy nomini beradi — UTC bo\'yicha', () => {
    expect(monthKey(new Date('2026-09-08T23:30:00Z'))).toBe('2026-09');
    expect(monthKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01');
  });

  it('oy chegarasi keyingi oy boshigacha', () => {
    const { start, end } = monthRange('2026-02');

    expect(start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('yanvardan oldingi oy — o\'tgan yil dekabri', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(previousMonth('2026-09')).toBe('2026-08');
  });

  it("noto'g'ri oy yozuvini rad etadi", () => {
    expect(isValidMonth('2026-09')).toBe(true);
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-00')).toBe(false);
    expect(isValidMonth('sentabr')).toBe(false);
    expect(isValidMonth('2026-9')).toBe(false);
  });
});

describe('changePercent', () => {
  it("o'sish va kamayishni hisoblaydi", () => {
    expect(changePercent(150, 100)).toBe(50);
    expect(changePercent(50, 100)).toBe(-50);
    expect(changePercent(100, 100)).toBe(0);
  });

  /**
   * O'tgan oyda xarajat bo'lmasa, foiz hisoblab bo'lmaydi.
   *
   * "Cheksiz o'sish" deb ko'rsatish yolg'on bo'lardi va nolga
   * bo'lish `Infinity` beradi — u ekranda xunuk chiqardi.
   */
  it("o'tgan oy nol bo'lsa null qaytaradi", () => {
    expect(changePercent(100, 0)).toBeNull();
    expect(changePercent(0, 0)).toBeNull();
  });
});
