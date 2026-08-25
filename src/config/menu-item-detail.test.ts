import { describe, expect, it } from 'vitest';

import {
  ALLERGENS,
  ALLERGEN_LABELS,
  describeAllergens,
  formatPortion,
  hasComposition,
} from '@/config/menu-item-detail';

/**
 * Taom tarkibi — testlar.
 */

const EMPTY = { ingredients: null, weightGrams: null, calories: null, allergens: [] };

describe('tarkib bormi', () => {
  it("HAMMASI bo'sh bo'lsa — yo'q", () => {
    /**
     * "Tarkibi: —" degan bo'sh bo'lim chizishdan ko'ra, uni
     * umuman ko'rsatmagan yaxshi.
     */
    expect(hasComposition(EMPTY)).toBe(false);
  });

  it('bitta maydon ham yetarli', () => {
    expect(hasComposition({ ...EMPTY, ingredients: "Go'sht, kartoshka" })).toBe(true);
    expect(hasComposition({ ...EMPTY, weightGrams: 300 })).toBe(true);
    expect(hasComposition({ ...EMPTY, calories: 450 })).toBe(true);
    expect(hasComposition({ ...EMPTY, allergens: ['GLUTEN'] })).toBe(true);
  });
});

describe('porsiya', () => {
  it("og'irlik va kaloriya BITTA qatorda", () => {
    expect(formatPortion(300, 450)).toBe('300 g · 450 kkal');
  });

  it('bittasi yo\'q bo\'lsa ikkinchisi yolg\'iz chiqadi', () => {
    expect(formatPortion(300, null)).toBe('300 g');
    expect(formatPortion(null, 450)).toBe('450 kkal');
  });

  it("ikkalasi ham yo'q bo'lsa — hech narsa", () => {
    expect(formatPortion(null, null)).toBeNull();
  });

  it('NOL qiymat ko\'rsatilmaydi', () => {
    /**
     * "0 g" degan yozuv ma'nosiz va xato ma'lumot kiritilganini
     * bildiradi. Uni ko'rsatgandan ko'ra yashirgan yaxshi.
     */
    expect(formatPortion(0, 0)).toBeNull();
    expect(formatPortion(0, 450)).toBe('450 kkal');
  });
});

describe('allergenlar', () => {
  it("nomlar o'zbekchada", () => {
    expect(describeAllergens(['GLUTEN', 'PEANUT'])).toEqual(['Gluten', "Yer yong'og'i"]);
  });

  it('NOMA\'LUM qiymat tashlab yuboriladi', () => {
    /**
     * Bazaga kelajakda yangi tur qo'shilsa, eski brauzer uni
     * "undefined" deb ko'rsatmasligi kerak.
     */
    expect(describeAllergens(['GLUTEN', 'KELAJAKDAGI_TUR'])).toEqual(['Gluten']);
  });

  it("bo'sh ro'yxat — bo'sh natija", () => {
    expect(describeAllergens([])).toEqual([]);
  });

  it('yer yong\'og\'i YONG\'OQDAN alohida', () => {
    /**
     * Tibbiyotda yer yong'og'i daraxt yong'oqlaridan ajratiladi:
     * reaksiyasi kuchliroq. Ularni birlashtirish "yong'oq yeyman,
     * lekin yer yong'og'i yolmayman" degan odamga noto'g'ri
     * ma'lumot berardi.
     */
    expect(ALLERGEN_LABELS.NUTS).not.toBe(ALLERGEN_LABELS.PEANUT);
  });

  it("ro'yxatda takror yo'q", () => {
    const values = ALLERGENS.map((option) => option.value);

    expect(new Set(values).size).toBe(values.length);
  });

  it('har birining nomi bor', () => {
    expect(ALLERGENS.every((option) => option.label.length > 0)).toBe(true);
  });
});
