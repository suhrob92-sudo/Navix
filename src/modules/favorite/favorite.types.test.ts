import { describe, expect, it } from 'vitest';

import { FAVORITE_TARGETS } from '@/config/favorite';
import { emptyFavoriteIds } from '@/modules/favorite/favorite.types';

/**
 * Sevimlilar — turlar testlari.
 */

describe("bo'sh ID to'plami", () => {
  it('HAR BIR tur uchun kalit bor', () => {
    /**
     * Kalit yetishmasa, o'sha turdagi yurakcha `undefined.has()`
     * xatosiga uchrab, butun sahifani qulatardi.
     */
    const ids = emptyFavoriteIds();

    for (const target of FAVORITE_TARGETS) {
      expect(Array.isArray(ids[target])).toBe(true);
      expect(ids[target]).toHaveLength(0);
    }
  });

  it('har safar YANGI obyekt qaytadi', () => {
    // Umumiy obyekt qaytsa, bitta foydalanuvchining ro'yxati
    // boshqasiniki bilan aralashib ketardi.
    const first = emptyFavoriteIds();

    first.PRODUCT.push('x');

    expect(emptyFavoriteIds().PRODUCT).toHaveLength(0);
  });

  it("faqat ma'lum turlar bor", () => {
    expect(Object.keys(emptyFavoriteIds()).sort()).toEqual([...FAVORITE_TARGETS].sort());
  });
});
