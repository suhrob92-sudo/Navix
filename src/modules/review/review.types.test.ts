import { describe, expect, it } from 'vitest';

import { emptyDistribution, shortAuthorName } from '@/modules/review/review.types';

/**
 * Baho va sharh — turlar testlari.
 */

describe('taqsimot', () => {
  it("1 dan 5 gacha NOLLAR bilan boshlanadi", () => {
    /**
     * Bo'sh kalitlar bo'lmasa, ustunli diagrammada baho qo'yilmagan
     * darajalar umuman chizilmasdi va diagramma "teshik" bo'lardi.
     */
    expect(emptyDistribution()).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });

  it('har safar YANGI obyekt qaytadi', () => {
    // Umumiy obyekt qaytsa, bitta so'rov ikkinchisining sonini buzardi.
    const first = emptyDistribution();

    first[5] = 10;

    expect(emptyDistribution()[5]).toBe(0);
  });
});

describe('muallif ismi', () => {
  it("familiya BOSH HARFGA qisqaradi", () => {
    /**
     * Sharh ochiq sahifada turadi. To'liq ism-familiya esa odamni
     * topish uchun yetarli ma'lumot.
     */
    expect(shortAuthorName('Aziz', 'Yusupov')).toBe('Aziz Y.');
  });

  it('familiya yo\'q bo\'lsa faqat ism', () => {
    expect(shortAuthorName('Aziz', null)).toBe('Aziz');
    expect(shortAuthorName('Aziz', '  ')).toBe('Aziz');
  });

  it("ism ham yo'q bo'lsa — 'Xaridor'", () => {
    // Ism ixtiyoriy maydon: telefon orqali kirgan odam uni to'ldirmasligi mumkin.
    expect(shortAuthorName(null, null)).toBe('Xaridor');
    expect(shortAuthorName('', '')).toBe('Xaridor');
  });

  it("faqat familiya bo'lsa bosh harf qoladi", () => {
    expect(shortAuthorName(null, 'Yusupov')).toBe('Y.');
  });

  it("bo'shliq kesiladi", () => {
    expect(shortAuthorName('  Aziz  ', '  Yusupov  ')).toBe('Aziz Y.');
  });
});
