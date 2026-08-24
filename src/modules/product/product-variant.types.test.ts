import { describe, expect, it } from 'vitest';

import {
  emptyVariants,
  findVariant,
  pruneSelection,
  sellableValueIds,
  type VariantView,
} from '@/modules/product/product-variant.types';

/**
 * Variant turlari — testlar.
 *
 * Bu funksiyalar BRAUZERDA ishlaydi: odam rangni bosganda narx
 * darhol o'zgarishi kerak va serverdan so'rash 300-800 ms kutish
 * demak.
 */

/** Ikki tanlov: rang (qora/oq) va xotira (128/256). */
const QORA = 'v-qora';
const OQ = 'v-oq';
const GB128 = 'v-128';
const GB256 = 'v-256';

function variant(ids: string[], stock = 5, isActive = true): VariantView {
  return {
    id: ids.join('-'),
    price: 100,
    oldPrice: null,
    stock,
    isActive,
    optionValueIds: ids,
    label: ids.join(' · '),
  };
}

describe("bo'sh natija", () => {
  it("tanlov ham, variant ham yo'q", () => {
    expect(emptyVariants()).toEqual({ options: [], variants: [] });
  });

  it('har safar YANGI obyekt qaytadi', () => {
    const first = emptyVariants();

    first.options.push({ id: 'x', name: 'X', values: [] });

    expect(emptyVariants().options).toHaveLength(0);
  });
});

describe('variantni topish', () => {
  const variants = [
    variant([QORA, GB128]),
    variant([QORA, GB256]),
    variant([OQ, GB256]),
  ];

  it("to'liq tanlovda topiladi", () => {
    expect(findVariant(variants, [QORA, GB256])?.id).toBe(`${QORA}-${GB256}`);
  });

  it('TARTIB ahamiyatsiz', () => {
    /**
     * Odam avval xotirani, keyin rangni bosishi mumkin. Natija
     * bir xil bo'lishi shart.
     */
    expect(findVariant(variants, [GB256, QORA])?.id).toBe(`${QORA}-${GB256}`);
  });

  it("YARIM tanlovda topilmaydi", () => {
    // Faqat rang tanlangan — narx hali noma'lum.
    expect(findVariant(variants, [QORA])).toBeNull();
  });

  it("mavjud bo'lmagan birikmada topilmaydi", () => {
    expect(findVariant(variants, [OQ, GB128])).toBeNull();
  });

  it("bo'sh tanlovda topilmaydi", () => {
    expect(findVariant(variants, [])).toBeNull();
  });
});

describe('sotuvdagi qiymatlar', () => {
  const variants = [variant([QORA, GB128]), variant([QORA, GB256]), variant([OQ, GB256])];

  it('barcha ishlatilgan qiymatlar sotuvda', () => {
    const sellable = sellableValueIds(variants);

    expect(sellable.has(QORA)).toBe(true);
    expect(sellable.has(OQ)).toBe(true);
    expect(sellable.has(GB128)).toBe(true);
    expect(sellable.has(GB256)).toBe(true);
  });

  it("ZAXIRASI tugagan variant hisobga olinmaydi", () => {
    const withEmpty = [variant([QORA, GB128], 5), variant([OQ, GB256], 0)];

    const sellable = sellableValueIds(withEmpty);

    expect(sellable.has(QORA)).toBe(true);
    expect(sellable.has(OQ)).toBe(false);
  });

  it("SOTUVDAN OLINGAN variant hisobga olinmaydi", () => {
    const withInactive = [variant([QORA, GB128]), variant([OQ, GB256], 5, false)];

    const sellable = sellableValueIds(withInactive);

    expect(sellable.has(QORA)).toBe(true);
    expect(sellable.has(OQ)).toBe(false);
  });

  it("variant yo'q bo'lsa hech narsa sotuvda emas", () => {
    expect(sellableValueIds([]).size).toBe(0);
  });

  it("boshqa tanlovga BOG'LIQ EMAS", () => {
    /**
     * Eng muhim tekshiruv: "128 GB" tanlangan bo'lsa ham, "Oq"
     * tugmasi ochiq qolishi kerak.
     *
     * Aks holda odam tuzoqqa tushardi: "Oq · 128 GB" yo'q, ya'ni
     * "Oq" o'chiq; "128 GB" esa tanlangan va uni almashtirish
     * uchun avval "Oq" ni bosish kerak edi.
     */
    const sellable = sellableValueIds(variants);

    expect(sellable.has(OQ)).toBe(true);
  });
});

describe('tanlovni tozalash', () => {
  const variants = [variant([QORA, GB128]), variant([QORA, GB256]), variant([OQ, GB256])];

  it('mos birikmada hech narsa o\'zgarmaydi', () => {
    expect(pruneSelection(variants, [QORA, GB256])).toEqual([QORA, GB256]);
  });

  it("MOS KELMAGAN tanlov bo'shatiladi", () => {
    /**
     * "Oq · 128 GB" birikmasi yo'q. Odam oxirgi bosgan qiymat
     * saqlanadi — aynan uning niyati shu.
     */
    expect(pruneSelection(variants, [GB128, OQ])).toEqual([OQ]);
  });

  it('bitta tanlov har doim saqlanadi', () => {
    expect(pruneSelection(variants, [QORA])).toEqual([QORA]);
    expect(pruneSelection(variants, [])).toEqual([]);
  });

  it("SOTUVDAN OLINGAN variant mos deb hisoblanmaydi", () => {
    const withInactive = [variant([QORA, GB128], 5, false)];

    expect(pruneSelection(withInactive, [QORA, GB128])).toEqual([GB128]);
  });
});
