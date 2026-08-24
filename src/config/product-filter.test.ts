import { describe, expect, it } from 'vitest';

import {
  RATING_OPTIONS,
  SORT_OPTIONS,
  activeFilterCount,
  describeFilter,
  emptyFilters,
  filtersToParams,
  paramsToFilters,
  priceRangeError,
} from '@/config/product-filter';

/**
 * Katalog filtrlari — testlar.
 */

describe('boshlang\'ich holat', () => {
  it('hech narsa tanlanmagan', () => {
    const filters = emptyFilters();

    expect(activeFilterCount(filters)).toBe(0);
    expect(filters.sort).toBe('popular');
  });
});

describe('yoqilgan filtrlar soni', () => {
  it('har bir filtr sanaladi', () => {
    expect(activeFilterCount({ sort: 'popular', minPriceSom: 1000 })).toBe(1);
    expect(activeFilterCount({ sort: 'popular', minPriceSom: 1000, maxPriceSom: 5000 })).toBe(2);
    expect(activeFilterCount({ sort: 'popular', shop: 'texnomart', inStock: true })).toBe(2);
  });

  it('SARALASH sanalmaydi', () => {
    /**
     * Saralash hech narsani yashirmaydi — u faqat tartibni
     * o'zgartiradi. Uni sanash "filtr yoqilgan" degan yolg'on
     * ogohlantirish berardi.
     */
    expect(activeFilterCount({ sort: 'cheap' })).toBe(0);
    expect(activeFilterCount({ sort: 'new' })).toBe(0);
  });

  it("YOQILMAGAN belgilar sanalmaydi", () => {
    expect(activeFilterCount({ sort: 'popular', inStock: undefined })).toBe(0);
  });
});

describe('manzilga yozish', () => {
  it("BO'SH qiymatlar tushirib qoldiriladi", () => {
    /**
     * `?minPriceSom=&shop=&inStock=false` ko'rinishidagi manzil
     * o'qib bo'lmas va uzun bo'lardi.
     */
    const params = filtersToParams(emptyFilters());

    expect(params.toString()).toBe('sort=popular');
  });

  it('SARALASH har doim yoziladi', () => {
    // U natijaning bir qismi va manzil to'liq bo'lishi kerak.
    expect(filtersToParams({ sort: 'cheap' }).get('sort')).toBe('cheap');
  });

  it('barcha filtrlar yoziladi', () => {
    const params = filtersToParams({
      sort: 'new',
      search: 'telefon',
      shop: 'texnomart',
      minPriceSom: 1_000,
      maxPriceSom: 5_000,
      inStock: true,
      hasDiscount: true,
      minRating: 4,
    });

    expect(params.get('search')).toBe('telefon');
    expect(params.get('shop')).toBe('texnomart');
    expect(params.get('minPriceSom')).toBe('1000');
    expect(params.get('maxPriceSom')).toBe('5000');
    expect(params.get('inStock')).toBe('true');
    expect(params.get('hasDiscount')).toBe('true');
    expect(params.get('minRating')).toBe('4');
  });
});

describe('manzildan o\'qish', () => {
  it("BORIB-KELISH natijani o'zgartirmaydi", () => {
    /**
     * Eng muhim tekshiruv: manzilga yozib, qaytadan o'qiganda
     * xuddi o'sha holat chiqishi kerak. Aks holda sahifa
     * yangilanganda filtrlar sekin-asta buzilib borardi.
     */
    const original = {
      sort: 'cheap' as const,
      search: 'telefon',
      shop: 'texnomart',
      minPriceSom: 1_000,
      maxPriceSom: 5_000,
      inStock: true,
      hasDiscount: true,
      minRating: 4,
    };

    expect(paramsToFilters(filtersToParams(original))).toEqual({ ...original, category: undefined });
  });

  it("YAROQSIZ son jimgina tashlanadi", () => {
    /**
     * Manzilni istalgan odam qo'lda yozishi mumkin. Tekshiruvsiz
     * bunday qiymat so'rovga tushib, sahifa bo'sh qolardi.
     */
    const filters = paramsToFilters(new URLSearchParams('minPriceSom=salom&maxPriceSom=-5'));

    expect(filters.minPriceSom).toBeUndefined();
    expect(filters.maxPriceSom).toBeUndefined();
  });

  it("YAROQSIZ saralash boshlang'ichga qaytadi", () => {
    expect(paramsToFilters(new URLSearchParams('sort=hack')).sort).toBe('popular');
  });

  it('YAROQSIZ baho tashlanadi', () => {
    // Faqat ro'yxatdagi qiymatlar qabul qilinadi.
    expect(paramsToFilters(new URLSearchParams('minRating=1')).minRating).toBeUndefined();
    expect(paramsToFilters(new URLSearchParams('minRating=4')).minRating).toBe(4);
  });

  it("`inStock=false` YOQILMAGAN deb o'qiladi", () => {
    // Aks holda "yoqilgan filtrlar" soni yolg'on bo'lardi.
    expect(paramsToFilters(new URLSearchParams('inStock=false')).inStock).toBeUndefined();
  });

  it("bo'sh manzilda boshlang'ich holat", () => {
    const filters = paramsToFilters(new URLSearchParams(''));

    expect(filters.sort).toBe('popular');
    expect(activeFilterCount(filters)).toBe(0);
  });
});

describe('narx oralig\'i', () => {
  it("teskari oraliq XATO", () => {
    /**
     * Serversiz bu bo'sh ro'yxat qaytarardi va odam "mahsulot
     * yo'q ekan" deb o'ylardi — aslida u shunchaki sonlarni
     * almashtirib yozgan.
     */
    expect(priceRangeError(5_000, 1_000)).not.toBeNull();
  });

  it("to'g'ri oraliq xatosiz", () => {
    expect(priceRangeError(1_000, 5_000)).toBeNull();
    expect(priceRangeError(1_000, 1_000)).toBeNull();
  });

  it("yarim oraliq xatosiz", () => {
    // Faqat "dan" yoki faqat "gacha" — odatiy holat.
    expect(priceRangeError(1_000, undefined)).toBeNull();
    expect(priceRangeError(undefined, 5_000)).toBeNull();
  });
});

describe('filtr belgilari', () => {
  it("yoqilmagan filtrda belgi yo'q", () => {
    expect(describeFilter(emptyFilters())).toEqual([]);
  });

  it('narx BO\'SHLIQ bilan yoziladi', () => {
    const chips = describeFilter({ sort: 'popular', minPriceSom: 1_200_000 });

    expect(chips[0].label).toBe('1 200 000 dan');
  });

  it("do'kon NOMI ko'rsatiladi", () => {
    /**
     * Manzildagi nom ("texnomart") emas, odam ko'rgan nom
     * ("Texnomart") chiqishi kerak.
     */
    const chips = describeFilter({ sort: 'popular', shop: 'texnomart' }, 'Texnomart');

    expect(chips[0].label).toBe('Texnomart');
  });

  it("nom berilmasa manzildagi nom qoladi", () => {
    const chips = describeFilter({ sort: 'popular', shop: 'texnomart' });

    expect(chips[0].label).toBe('texnomart');
  });

  it('har bir belgining KALITI bor', () => {
    /**
     * Kalit "olib tashlash" tugmasi uchun kerak: usiz qaysi
     * filtrni o'chirish kerakligi noma'lum bo'lardi.
     */
    const chips = describeFilter({
      sort: 'popular',
      minPriceSom: 1_000,
      shop: 'x',
      inStock: true,
      hasDiscount: true,
      minRating: 4,
    });

    expect(chips).toHaveLength(5);
    expect(new Set(chips.map((chip) => chip.key)).size).toBe(5);
  });
});

describe('ro\'yxatlar', () => {
  it('saralash turlari takrorlanmaydi', () => {
    const values = SORT_OPTIONS.map((option) => option.value);

    expect(new Set(values).size).toBe(values.length);
  });

  it('baho darajalari KAMAYISH tartibida', () => {
    /**
     * "4 va undan yuqori" birinchi turishi kerak: odam odatda
     * eng yaxshisini izlaydi.
     */
    const values = RATING_OPTIONS.map((option) => option.value);

    expect(values).toEqual([...values].sort((a, b) => b - a));
  });
});
