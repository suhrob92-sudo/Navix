import { describe, expect, it } from 'vitest';

import {
  averageRating,
  BLOCK_REASON_TEXT,
  clampRating,
  formatRating,
  MAX_RATING,
  MIN_RATING,
  RATING_LABEL,
  ratingCountText,
  ratingShare,
  REVIEW_TARGETS,
  reviewsPath,
  TARGET_COLUMN,
  TARGET_LABEL,
  TARGET_SLUG,
  targetFromSlug,
} from '@/config/review';

/**
 * Baho va sharh — sozlama testlari.
 */

describe('turlar jadvali', () => {
  it('har bir turda ustun, nom va manzil BOR', () => {
    /**
     * Yangi tur qo'shilib, jadvallardan biriga yozish unutilsa, kod
     * ishlab turaveradi va faqat o'sha turdagi baho yo'qoladi.
     */
    for (const target of REVIEW_TARGETS) {
      expect(TARGET_COLUMN[target]).toBeTruthy();
      expect(TARGET_LABEL[target]).toBeTruthy();
      expect(TARGET_SLUG[target]).toBeTruthy();
    }
  });

  it('ustun va manzil nomlari TAKRORLANMAYDI', () => {
    const columns = REVIEW_TARGETS.map((target) => TARGET_COLUMN[target]);
    const slugs = REVIEW_TARGETS.map((target) => TARGET_SLUG[target]);

    expect(new Set(columns).size).toBe(columns.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('manzildan tur topiladi', () => {
    for (const target of REVIEW_TARGETS) {
      expect(targetFromSlug(TARGET_SLUG[target])).toBe(target);
    }
  });

  it("noma'lum manzil `null`", () => {
    expect(targetFromSlug('shunday-narsa-yoq')).toBeNull();
    expect(targetFromSlug('')).toBeNull();
    // Manzil aniq bir ko'rinishda: aks holda bitta sahifa ikki manzilda ochilardi.
    expect(targetFromSlug('PRODUCT')).toBeNull();
  });

  it('manzil yasaladi', () => {
    expect(reviewsPath('MENU_ITEM', 'abc')).toBe('/api/v1/reviews/menu-item/abc');
  });
});

describe("o'rtacha baho", () => {
  it("baho yo'q bo'lsa nol", () => {
    expect(averageRating(0, 0)).toBe(0);
  });

  it("bitta bahoning o'zi", () => {
    expect(averageRating(5, 1)).toBe(5);
  });

  it("O'NDAN BIRIGACHA yaxlitlanadi", () => {
    /**
     * Bazada reyting `Decimal(2,1)`. Ko'proq kasr saqlansa, baza
     * bilan ekran o'rtasida farq paydo bo'lardi.
     */
    expect(averageRating(14, 3)).toBe(4.7);
    expect(averageRating(10, 3)).toBe(3.3);
  });

  it('manfiy son berilmaydi', () => {
    expect(averageRating(0, 5)).toBe(0);
  });

  it("nolga BO'LINISH bo'lmaydi", () => {
    // Oxirgi sharh o'chirilganda aynan shu holat yuz beradi.
    expect(Number.isNaN(averageRating(12, 0))).toBe(false);
    expect(averageRating(12, 0)).toBe(0);
  });
});

describe('baho matni', () => {
  it("baho yo'q bo'lsa AYTILADI", () => {
    /**
     * Eng muhim tekshiruv: "0.0" yozuvi bahosiz do'konni eng yomon
     * do'kondek ko'rsatardi.
     */
    expect(formatRating(0, 0)).toBe("Baho yo'q");
    expect(formatRating(4.5, 0)).toBe("Baho yo'q");
  });

  it("bitta kasr xonasi bilan yoziladi", () => {
    expect(formatRating(4.7, 10)).toBe('4.7');
    expect(formatRating(5, 10)).toBe('5.0');
    expect(formatRating(3, 1)).toBe('3.0');
  });

  it('baho soni yoziladi', () => {
    expect(ratingCountText(0)).toBe("Hali baho yo'q");
    expect(ratingCountText(1)).toBe('1 ta baho');
    expect(ratingCountText(12)).toBe('12 ta baho');
  });
});

describe('ulush', () => {
  it("jami nol bo'lsa nol", () => {
    expect(ratingShare(0, 0)).toBe(0);
  });

  it('foizga aylantiradi', () => {
    expect(ratingShare(1, 2)).toBe(50);
    expect(ratingShare(3, 3)).toBe(100);
  });

  it('KATTA va KICHIK sonlar bir xil ko\'rinadi', () => {
    // 3 tadan 2 tasi va 300 tadan 200 tasi bir xil ulush.
    expect(ratingShare(2, 3)).toBe(ratingShare(200, 300));
  });
});

describe('chegaralar', () => {
  it('baho 1 dan 5 gacha', () => {
    expect(MIN_RATING).toBe(1);
    expect(MAX_RATING).toBe(5);
  });

  it('har bir bahoning NOMI bor', () => {
    for (let star = MIN_RATING; star <= MAX_RATING; star += 1) {
      expect(RATING_LABEL[star]).toBeTruthy();
    }
  });

  it('chegaradan chiqqan qiymat qamaladi', () => {
    expect(clampRating(0)).toBe(MIN_RATING);
    expect(clampRating(99)).toBe(MAX_RATING);
    expect(clampRating(Number.NaN)).toBe(MIN_RATING);
    expect(clampRating(3.4)).toBe(3);
  });

  it('har bir sababning MATNI bor', () => {
    /**
     * Sababsiz tugmani yashirish eng yomon yechim: odam nima uchun
     * baho qo'ya olmayotganini bilmasdi.
     */
    for (const text of Object.values(BLOCK_REASON_TEXT)) {
      expect(text.length).toBeGreaterThan(5);
    }
  });
});
