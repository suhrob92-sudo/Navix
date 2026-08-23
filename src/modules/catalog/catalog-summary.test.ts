import { describe, expect, it } from 'vitest';

import {
  hotelSummary,
  menuItemSummary,
  productSummary,
  restaurantSummary,
  vacancySummary,
} from '@/modules/catalog/catalog-summary';

/**
 * Katalog qisqa ko'rinishi — testlar.
 *
 * Bu o'girish IKKI modulda ishlatiladi: sevimlilar va yaqinda
 * ko'rilganlar. Shuning uchun uning xatosi ikki joyda ko'rinadi.
 */

/** Bazadan keladigan `Decimal`/`BigInt` qiymatlarni taqlid qiladi. */
const tiyin = (som: number) => BigInt(som * 100);

describe('mahsulot', () => {
  const base = {
    id: 'p1',
    slug: 'telefon',
    name: 'Telefon',
    price: tiyin(1_000),
    isActive: true,
    stock: 3,
    shop: { name: 'Texnomart' },
    images: [{ url: '/a.jpg', alt: 'Telefon' }],
  };

  it('asosiy maydonlar to\'g\'ri', () => {
    const result = productSummary(base);

    expect(result.name).toBe('Telefon');
    expect(result.href).toBe('/marketplace/p/telefon');
    expect(result.subtitle).toBe('Texnomart');
    expect(result.priceTiyin).toBe(100_000);
    expect(result.image).toEqual({ url: '/a.jpg', alt: 'Telefon' });
  });

  it('ZAXIRA tugagan bo\'lsa mavjud emas', () => {
    /**
     * Bunday mahsulot ro'yxatdan yo'qolmaydi — xiralashadi. Uni
     * o'chirib yuborsak, odam "men buni saqlagan edim-ku" deb
     * hayron bo'lardi.
     */
    expect(productSummary({ ...base, stock: 0 }).isAvailable).toBe(false);
  });

  it("sotuvdan olingan bo'lsa mavjud emas", () => {
    expect(productSummary({ ...base, isActive: false }).isAvailable).toBe(false);
  });

  it("rasmsiz mahsulotda `null`", () => {
    expect(productSummary({ ...base, images: [] }).image).toBeNull();
  });
});

describe('taom', () => {
  it("havola RESTORAN menyusiga ketadi", () => {
    /**
     * Taomning o'z sahifasi yo'q. Havola bo'sh qoldirilsa,
     * kartochka bosilmaydigan bo'lardi.
     */
    const result = menuItemSummary({
      id: 'm1',
      name: "Lag'mon",
      price: tiyin(30),
      isAvailable: true,
      restaurant: { name: 'Osh Markazi', slug: 'osh-markazi' },
      images: [],
    });

    expect(result.href).toBe('/food/osh-markazi');
    expect(result.subtitle).toBe('Osh Markazi');
    expect(result.priceTiyin).toBe(3_000);
  });
});

describe('restoran', () => {
  it('narxi YO\'Q', () => {
    // Restoranning bitta narxi bo'lmaydi — uni ko'rsatish yolg'on bo'lardi.
    const result = restaurantSummary({
      id: 'r1',
      slug: 'osh',
      name: 'Osh',
      cuisine: 'Milliy',
      isActive: true,
      images: [],
    });

    expect(result.priceTiyin).toBeNull();
    expect(result.subtitle).toBe('Milliy');
  });
});

describe('mehmonxona', () => {
  const base = {
    id: 'h1',
    slug: 'hilton',
    name: 'Hilton',
    city: 'Toshkent',
    isActive: true,
    images: [],
    rooms: [{ pricePerNight: tiyin(500) }],
  };

  it("eng arzon xona narxi 'dan' bilan", () => {
    const result = hotelSummary(base);

    expect(result.priceTiyin).toBe(50_000);
    expect(result.pricePrefix).toBe('dan');
  });

  it("xonasi yo'q bo'lsa narx ham yo'q", () => {
    const result = hotelSummary({ ...base, rooms: [] });

    expect(result.priceTiyin).toBeNull();
    expect(result.pricePrefix).toBeNull();
  });
});

describe('vakansiya', () => {
  const base = {
    id: 'v1',
    slug: 'dasturchi',
    title: 'Dasturchi',
    city: 'Toshkent',
    salaryMin: tiyin(5_000_000),
    isActive: true,
    company: { name: 'Navix' },
  };

  it("havola to'g'ri manzilga ketadi", () => {
    // Vakansiya sahifasi `/jobs/v/[slug]` da turadi, `/jobs/[slug]` da emas.
    expect(vacancySummary(base).href).toBe('/jobs/v/dasturchi');
  });

  it('kompaniya va shahar birga ko\'rsatiladi', () => {
    expect(vacancySummary(base).subtitle).toBe('Navix · Toshkent');
  });

  it("maosh KELISHILGAN bo'lsa nol ko'rsatilmaydi", () => {
    /**
     * Nol "bepul ish" degan ma'noni berardi. `null` esa
     * interfeysda "Kelishilgan" bo'lib chiqadi.
     */
    const result = vacancySummary({ ...base, salaryMin: null });

    expect(result.priceTiyin).toBeNull();
    expect(result.pricePrefix).toBeNull();
  });

  it("vakansiyada rasm yo'q", () => {
    expect(vacancySummary(base).image).toBeNull();
  });
});
