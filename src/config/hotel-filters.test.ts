import { describe, expect, it } from 'vitest';

import {
  AMENITY_OPTIONS,
  STAR_OPTIONS,
  activeHotelFilterCount,
  clearHotelFilter,
  describeHotelFilters,
  emptyHotelFilters,
  hotelFiltersToParams,
  hotelPriceRangeError,
  paramsToHotelFilters,
  type HotelFilters,
} from '@/config/hotel-filters';

/**
 * Mehmonxona filtrlari — testlar.
 *
 * Filtr yashiradigan narsani odam KO'RMAYDI. Shuning uchun bu
 * yerdagi xato "mehmonxona yo'q ekan" degan yolg'on xulosaga olib
 * keladi.
 */

const som = (value: number) => `${value} so'm`;

describe("bo'sh holat", () => {
  it('hech narsa tanlanmagan', () => {
    const filters = emptyHotelFilters();

    expect(activeHotelFilterCount(filters)).toBe(0);
    expect(describeHotelFilters(filters, som)).toEqual([]);
  });

  it('saralash SANALMAYDI', () => {
    // Saralash hech narsani yashirmaydi — faqat tartibni o'zgartiradi.
    expect(activeHotelFilterCount({ sort: 'price' })).toBe(0);
  });
});

describe('sanash', () => {
  it('har bir filtr bittadan sanaladi', () => {
    const filters: HotelFilters = { sort: 'popular', city: 'Toshkent', minStars: 4, maxPriceSom: 700_000 };

    expect(activeHotelFilterCount(filters)).toBe(3);
  });

  it('qulayliklar HAR BIRI alohida sanaladi', () => {
    /**
     * Uchta qulaylik belgilagan odam uchta shart qo'ygan. Tugmada
     * "1" turgani uni chalg'itardi.
     */
    const filters: HotelFilters = { sort: 'popular', amenities: ['Wi-Fi', 'Nonushta', 'Hovli'] };

    expect(activeHotelFilterCount(filters)).toBe(3);
  });

  it("o'zgarmas maydon sanalmaydi", () => {
    // Shahar sahifasida shahar manzil yo'lida turadi va o'chirilmaydi.
    const filters: HotelFilters = { sort: 'popular', city: 'Buxoro', minStars: 4 };

    expect(activeHotelFilterCount(filters, ['city'])).toBe(1);
  });
});

describe('manzil satri', () => {
  it('to\'liq filtr yozilib, qaytib o\'qiladi', () => {
    const filters: HotelFilters = {
      sort: 'rating',
      search: 'plaza',
      city: 'Toshkent',
      district: 'Mirobod',
      minPriceSom: 300_000,
      maxPriceSom: 900_000,
      minStars: 4,
      amenities: ['Wi-Fi', 'Nonushta'],
    };

    expect(paramsToHotelFilters(hotelFiltersToParams(filters))).toEqual(filters);
  });

  it("bo'sh qiymatlar YOZILMAYDI", () => {
    // `?city=&minStars=` ko'rinishidagi manzil o'qib bo'lmas bo'lardi.
    const params = hotelFiltersToParams(emptyHotelFilters());

    expect(params.toString()).toBe('sort=popular');
  });

  it('qulayliklar VERGUL bilan yoziladi', () => {
    const params = hotelFiltersToParams({ sort: 'popular', amenities: ['Wi-Fi', 'Hovli'] });

    expect(params.get('amenities')).toBe('Wi-Fi,Hovli');
  });

  it('yaroqsiz son jimgina TASHLANADI', () => {
    /**
     * Manzilni istalgan odam qo'lda yozishi mumkin. Sahifa baribir
     * ochilishi kerak — faqat o'sha filtrsiz.
     */
    const filters = paramsToHotelFilters(new URLSearchParams('minPriceSom=salom&maxPriceSom=-5'));

    expect(filters.minPriceSom).toBeUndefined();
    expect(filters.maxPriceSom).toBeUndefined();
  });

  it("ro'yxatda YO'Q qulaylik qabul qilinmaydi", () => {
    const filters = paramsToHotelFilters(new URLSearchParams('amenities=Wi-Fi,Vertolyot maydoni'));

    expect(filters.amenities).toEqual(['Wi-Fi']);
  });

  it('takrorlangan qulaylik BIR MARTA olinadi', () => {
    const filters = paramsToHotelFilters(new URLSearchParams('amenities=Wi-Fi,Wi-Fi'));

    expect(filters.amenities).toEqual(['Wi-Fi']);
  });

  it("noma'lum saralash standartga qaytadi", () => {
    expect(paramsToHotelFilters(new URLSearchParams('sort=hack')).sort).toBe('popular');
  });

  it("ro'yxatda yo'q yulduz qabul qilinmaydi", () => {
    // Faqat 3, 4, 5 tanlovi bor — "1 yulduzdan yuqori" ma'nosiz filtr.
    expect(paramsToHotelFilters(new URLSearchParams('minStars=1')).minStars).toBeUndefined();
    expect(paramsToHotelFilters(new URLSearchParams('minStars=4')).minStars).toBe(4);
  });
});

describe('narx oralig\'i', () => {
  it("to'g'ri oraliqda xato yo'q", () => {
    expect(hotelPriceRangeError({ sort: 'popular', minPriceSom: 100, maxPriceSom: 200 })).toBeNull();
  });

  it('teskari oraliq AYTILADI', () => {
    /**
     * Serverga yuborilsa, u bo'sh ro'yxat qaytarardi va odam
     * "mehmonxona yo'q ekan" deb o'ylardi.
     */
    expect(hotelPriceRangeError({ sort: 'popular', minPriceSom: 900, maxPriceSom: 100 })).not.toBeNull();
  });

  it('bittasi bo\'lsa xato yo\'q', () => {
    expect(hotelPriceRangeError({ sort: 'popular', minPriceSom: 900 })).toBeNull();
  });
});

describe('yorliqlar', () => {
  it('narx yo\'nalishi bilan aytiladi', () => {
    const chips = describeHotelFilters({ sort: 'popular', minPriceSom: 300, maxPriceSom: 900 }, som);

    expect(chips.map((chip) => chip.label)).toEqual(["300 so'm dan", "900 so'm gacha"]);
  });

  it('yulduz matni tanlovdan olinadi', () => {
    const chips = describeHotelFilters({ sort: 'popular', minStars: 4 }, som);

    expect(chips[0].label).toBe(STAR_OPTIONS.find((option) => option.value === 4)?.label);
  });

  it('har bir qulaylik ALOHIDA yorliq', () => {
    // Odam ulardan bittasini o'chirmoqchi bo'lishi mumkin.
    const chips = describeHotelFilters({ sort: 'popular', amenities: ['Wi-Fi', 'Hovli'] }, som);

    expect(chips).toHaveLength(2);
    expect(chips[0].value).toBe('Wi-Fi');
  });

  it("o'zgarmas maydon yorliq bermaydi", () => {
    const chips = describeHotelFilters({ sort: 'popular', city: 'Xiva' }, som, ['city']);

    expect(chips).toEqual([]);
  });
});

describe("o'chirish", () => {
  it('bitta filtr o\'chadi', () => {
    const next = clearHotelFilter({ sort: 'popular', minStars: 4, city: 'Xiva' }, 'minStars');

    expect(next.minStars).toBeUndefined();
    expect(next.city).toBe('Xiva');
  });

  it('shahar o\'chsa TUMAN ham o\'chadi', () => {
    /**
     * "Mirobod" degan tuman boshqa shaharda yo'q. Yolg'iz qolsa
     * ro'yxat bo'sh chiqardi va odam sababini tushunmasdi.
     */
    const next = clearHotelFilter({ sort: 'popular', city: 'Toshkent', district: 'Mirobod' }, 'city');

    expect(next.city).toBeUndefined();
    expect(next.district).toBeUndefined();
  });

  it('bitta qulaylik o\'chadi, qolganlari QOLADI', () => {
    const next = clearHotelFilter(
      { sort: 'popular', amenities: ['Wi-Fi', 'Hovli', 'Nonushta'] },
      'amenities',
      'Hovli',
    );

    expect(next.amenities).toEqual(['Wi-Fi', 'Nonushta']);
  });

  it('oxirgi qulaylik o\'chsa maydon butunlay ketadi', () => {
    // Bo'sh massiv qolsa, manzilda `amenities=` degan chiqindi yozilardi.
    const next = clearHotelFilter({ sort: 'popular', amenities: ['Wi-Fi'] }, 'amenities', 'Wi-Fi');

    expect(next.amenities).toBeUndefined();
  });

  it('saralash TEGILMAYDI', () => {
    const next = clearHotelFilter({ sort: 'rating', minStars: 5 }, 'minStars');

    expect(next.sort).toBe('rating');
  });
});

describe('qulayliklar ro\'yxati', () => {
  it('takrorlanmaydi', () => {
    expect(new Set(AMENITY_OPTIONS).size).toBe(AMENITY_OPTIONS.length);
  });

  it('juda uzun emas', () => {
    // Yigirmata tugma tanlashni osonlashtirmaydi, qiyinlashtiradi.
    expect(AMENITY_OPTIONS.length).toBeLessThanOrEqual(10);
  });
});
