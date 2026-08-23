import { describe, expect, it } from 'vitest';

import {
  EMPTY_FAVORITES_TEXT,
  FAVORITE_COLUMN,
  FAVORITE_GROUP_LABEL,
  FAVORITE_LABEL,
  FAVORITE_SLUG,
  FAVORITE_TARGETS,
  MAX_FAVORITES_PER_TARGET,
  favoriteButtonLabel,
  favoritePath,
  favoriteTargetFromSlug,
} from '@/config/favorite';

/**
 * Sevimlilar — sozlama testlari.
 */

describe('turlar jadvali', () => {
  it('har bir turda ustun, nom, manzil va bo\'lim nomi BOR', () => {
    /**
     * Yangi tur qo'shilib, jadvallardan biriga yozish unutilsa,
     * sevimlilar sahifasida nomsiz bo'lim paydo bo'lardi.
     */
    for (const target of FAVORITE_TARGETS) {
      expect(FAVORITE_COLUMN[target]).toBeTruthy();
      expect(FAVORITE_LABEL[target]).toBeTruthy();
      expect(FAVORITE_SLUG[target]).toBeTruthy();
      expect(FAVORITE_GROUP_LABEL[target]).toBeTruthy();
      expect(EMPTY_FAVORITES_TEXT[target]).toBeTruthy();
    }
  });

  it('ustun va manzil nomlari TAKRORLANMAYDI', () => {
    const columns = FAVORITE_TARGETS.map((target) => FAVORITE_COLUMN[target]);
    const slugs = FAVORITE_TARGETS.map((target) => FAVORITE_SLUG[target]);

    expect(new Set(columns).size).toBe(columns.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("manzil faqat kichik harf va tire", () => {
    for (const target of FAVORITE_TARGETS) {
      expect(FAVORITE_SLUG[target]).toMatch(/^[a-z][a-z-]*[a-z]$/);
    }
  });

  it('manzildan tur topiladi', () => {
    for (const target of FAVORITE_TARGETS) {
      expect(favoriteTargetFromSlug(FAVORITE_SLUG[target])).toBe(target);
    }
  });

  it("noma'lum manzil `null`", () => {
    expect(favoriteTargetFromSlug('shunday-narsa-yoq')).toBeNull();
    expect(favoriteTargetFromSlug('')).toBeNull();
    expect(favoriteTargetFromSlug('PRODUCT')).toBeNull();
  });

  it('manzil yasaladi', () => {
    expect(favoritePath('MENU_ITEM', 'abc')).toBe('/api/v1/favorites/menu-item/abc');
  });
});

describe('tugma matni', () => {
  it("holatga qarab O'ZGARADI", () => {
    /**
     * Tugmada faqat belgi turadi va ekranni o'quvchi dastur uni
     * o'qiy olmaydi. Matn ikki holatni ham aniq aytishi kerak.
     */
    const add = favoriteButtonLabel(false, 'Telefon');
    const remove = favoriteButtonLabel(true, 'Telefon');

    expect(add).not.toBe(remove);
    expect(add).toContain('Telefon');
    expect(remove).toContain('Telefon');
  });

  it("qo'shishda va olib tashlashda aniq so'z bor", () => {
    expect(favoriteButtonLabel(false, 'X')).toContain("qo'shish");
    expect(favoriteButtonLabel(true, 'X')).toContain('olib tashlash');
  });
});

describe('chegara', () => {
  it('mantiqiy', () => {
    // Odam odatda 10-30 ta narsa saqlaydi; chegara skript uchun.
    expect(MAX_FAVORITES_PER_TARGET).toBeGreaterThan(50);
    expect(MAX_FAVORITES_PER_TARGET).toBeLessThanOrEqual(1_000);
  });
});
