import { describe, expect, it } from 'vitest';

import {
  MAX_OPTIONS,
  MAX_VALUES_PER_OPTION,
  MAX_VARIANTS,
  needsFromPrefix,
  variantLabel,
  variantState,
} from '@/config/product-variant';

/**
 * Mahsulot variantlari — sozlama testlari.
 */

describe('variant nomi', () => {
  it("qiymatlar NUQTA bilan birlashtiriladi", () => {
    expect(variantLabel(['Qora', '256 GB'])).toBe('Qora · 256 GB');
  });

  it('bitta qiymatda ajratuvchi yo\'q', () => {
    expect(variantLabel(['Qora'])).toBe('Qora');
  });

  it("qiymat ichidagi VERGUL buzilmaydi", () => {
    /**
     * Ajratuvchi sifatida vergul olinganda "6,6 dyuym" degan
     * qiymat ikkiga bo'linib ketardi.
     */
    expect(variantLabel(['6,6 dyuym', 'Qora'])).toBe('6,6 dyuym · Qora');
  });

  it("bo'sh ro'yxatda bo'sh matn", () => {
    expect(variantLabel([])).toBe('');
  });
});

describe('zaxira holati', () => {
  it('nol — tugagan', () => {
    expect(variantState(0)).toBe('out');
  });

  it('manfiy ham tugagan deb hisoblanadi', () => {
    // Bazada manfiy bo'lmasligi kerak, lekin ekran qulamasligi shart.
    expect(variantState(-5)).toBe('out');
  });

  it('ozgina qolganda ogohlantiriladi', () => {
    expect(variantState(1)).toBe('low');
    expect(variantState(3)).toBe('low');
  });

  it("yetarli bo'lganda oddiy holat", () => {
    expect(variantState(4)).toBe('available');
    expect(variantState(100)).toBe('available');
  });
});

describe('"dan" belgisi', () => {
  it("narxlar HAR XIL bo'lsa kerak", () => {
    /**
     * Eng muhim tekshiruv: aks holda katalogdagi narx yolg'on
     * bo'lardi — odam 4 290 000 so'mni ko'rib kirsa, ichkarida
     * 5 890 000 so'mni ko'rardi.
     */
    expect(needsFromPrefix([100, 200])).toBe(true);
  });

  it("narxlar BIR XIL bo'lsa kerak emas", () => {
    expect(needsFromPrefix([100, 100, 100])).toBe(false);
  });

  it('bitta variantda kerak emas', () => {
    expect(needsFromPrefix([100])).toBe(false);
  });

  it("variantsiz mahsulotda kerak emas", () => {
    expect(needsFromPrefix([])).toBe(false);
  });
});

describe('chegaralar', () => {
  it('tanlovlar soni mantiqiy', () => {
    /**
     * Uchta tanlov birikmalarni ko'paytirib yuborardi: 3 × 5 = 125
     * ta variant va sotuvchi ularning har biriga narx yozishi
     * kerak bo'lardi.
     */
    expect(MAX_OPTIONS).toBe(2);
  });

  it("variantlar soni birikmalardan KAM", () => {
    /**
     * 12 × 12 = 144 nazariy jihatdan mumkin, lekin amalda
     * sotuvchi hammasini sotmaydi.
     */
    expect(MAX_VARIANTS).toBeLessThan(MAX_VALUES_PER_OPTION ** MAX_OPTIONS);
    expect(MAX_VARIANTS).toBeGreaterThan(MAX_VALUES_PER_OPTION);
  });
});
