import { describe, expect, it } from 'vitest';

import { FAVORITE_TARGETS } from '@/config/favorite';
import {
  MAX_RECENT_VIEWS,
  RECENT_COLUMN,
  RECENT_LABEL,
  RECENT_ROW_SIZE,
  RECENT_SLUG,
  RECENT_TARGETS,
  recentPath,
  recentTargetFromSlug,
} from '@/config/recent';

/**
 * Yaqinda ko'rilganlar — sozlama testlari.
 */

describe('turlar jadvali', () => {
  it('har bir turda ustun, nom va manzil BOR', () => {
    for (const target of RECENT_TARGETS) {
      expect(RECENT_COLUMN[target]).toBeTruthy();
      expect(RECENT_LABEL[target]).toBeTruthy();
      expect(RECENT_SLUG[target]).toBeTruthy();
    }
  });

  it('ustun va manzil nomlari TAKRORLANMAYDI', () => {
    const columns = RECENT_TARGETS.map((target) => RECENT_COLUMN[target]);
    const slugs = RECENT_TARGETS.map((target) => RECENT_SLUG[target]);

    expect(new Set(columns).size).toBe(columns.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('SEVIMLILAR bilan bir xil turlar', () => {
    /**
     * Ikkalasi bir xil beshta narsani qamrab oladi va bir xil
     * kartochka chizadi.
     *
     * Ular ajralib ketsa, mahsulotni sevimlilarga qo'sha oladigan,
     * lekin ko'rish tarixida ko'ra olmaydigan holat paydo
     * bo'lardi — va buni hech kim sezmasdi.
     */
    expect([...RECENT_TARGETS].sort()).toEqual([...FAVORITE_TARGETS].sort());
  });

  it('manzildan tur topiladi', () => {
    for (const target of RECENT_TARGETS) {
      expect(recentTargetFromSlug(RECENT_SLUG[target])).toBe(target);
    }
  });

  it("noma'lum manzil `null`", () => {
    expect(recentTargetFromSlug('shunday-narsa-yoq')).toBeNull();
    expect(recentTargetFromSlug('')).toBeNull();
    expect(recentTargetFromSlug('PRODUCT')).toBeNull();
  });

  it('manzil yasaladi', () => {
    expect(recentPath('MENU_ITEM', 'abc')).toBe('/api/v1/recent/menu-item/abc');
  });
});

describe('chegaralar', () => {
  it("saqlanadigan yozuvlar soni mantiqiy", () => {
    /**
     * Cheksiz o'ssa, faol foydalanuvchida bir yilda minglab yozuv
     * yig'ilardi va u hech kimga kerak bo'lmasdi.
     */
    expect(MAX_RECENT_VIEWS).toBeGreaterThan(10);
    expect(MAX_RECENT_VIEWS).toBeLessThanOrEqual(200);
  });

  it("qatordagi soni saqlanadigandan KAM", () => {
    // Aks holda qator butun tarixni tortib olardi.
    expect(RECENT_ROW_SIZE).toBeLessThan(MAX_RECENT_VIEWS);
    expect(RECENT_ROW_SIZE).toBeGreaterThan(0);
  });
});
