import { describe, expect, it } from 'vitest';

import {
  createRideSchema,
  driverProfileSchema,
  rateRideSchema,
  rideOffersSchema,
  taxiQuoteSchema,
} from '@/modules/taxi/taxi.schemas';

/**
 * Validatsiya — birinchi chegara.
 *
 * Bu yerdagi qoidalar buzilsa, xato ichkariga o'tib ketadi va uni
 * baza yoki hisob-kitob ushlaydi — o'shanda xabar tushunarsiz
 * bo'ladi ("baza cheklovi buzildi" degan matnni foydalanuvchi
 * o'qimasligi kerak).
 */

const TOSHKENT = { lat: 41.3111, lng: 69.2797 };

describe('taxiQuoteSchema', () => {
  it("O'zbekiston ichidagi nuqtani qabul qiladi", () => {
    const result = taxiQuoteSchema.safeParse({
      fromLat: TOSHKENT.lat,
      fromLng: TOSHKENT.lng,
      toLat: 41.3255,
      toLng: 69.2345,
    });

    expect(result.success).toBe(true);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * (0, 0) — Atlantika okeanidagi nuqta. U -90..90 chegarasiga
   * to'g'ri keladi, ya'ni oddiy tekshiruv uni o'tkazib yuborardi.
   * Natijada masofa ming kilometr chiqib, million so'mlik buyurtma
   * yaratilardi.
   */
  it('okeandagi (0, 0) nuqtasini rad etadi', () => {
    const result = taxiQuoteSchema.safeParse({
      fromLat: 0,
      fromLng: 0,
      toLat: TOSHKENT.lat,
      toLng: TOSHKENT.lng,
    });

    expect(result.success).toBe(false);
  });

  it('qo\'shni davlatdagi nuqtani rad etadi', () => {
    // Olmaota — chegaradan tashqarida.
    const result = taxiQuoteSchema.safeParse({
      fromLat: 43.238,
      fromLng: 76.889,
      toLat: TOSHKENT.lat,
      toLng: TOSHKENT.lng,
    });

    expect(result.success).toBe(false);
  });
});

describe('createRideSchema', () => {
  const valid = {
    tariff: 'ECONOM',
    fromLat: TOSHKENT.lat,
    fromLng: TOSHKENT.lng,
    fromAddress: 'Chorsu bozori',
    toLat: 41.3255,
    toLng: 69.2345,
    toAddress: 'Oybek',
    idempotencyKey: 'abc12345',
  };

  it('to\'g\'ri so\'rovni qabul qiladi', () => {
    expect(createRideSchema.safeParse(valid).success).toBe(true);
  });

  /**
   * Narx SO'ROVDA bo'lmasligi kerak — u serverda hisoblanadi.
   *
   * Zod ortiqcha maydonni jimgina tashlab ketadi, lekin bu sinov
   * shu xatti-harakatni QOTIRADI: kelajakda kimdir `priceTiyin`
   * maydonini sxemaga qo'shsa, sinov yiqiladi va sabab so'raladi.
   */
  it('narxni qabul qilmaydi — u serverda hisoblanadi', () => {
    const result = createRideSchema.safeParse({ ...valid, priceTiyin: 100 });

    expect(result.success).toBe(true);
    expect(result.success && 'priceTiyin' in result.data).toBe(false);
  });

  it('idempotentlik kaliti MAJBURIY — pul ikki marta yechilmasligi uchun', () => {
    const { idempotencyKey: _omit, ...withoutKey } = valid;

    expect(createRideSchema.safeParse(withoutKey).success).toBe(false);
  });

  it("noma'lum tarifni rad etadi", () => {
    expect(createRideSchema.safeParse({ ...valid, tariff: 'BEPUL' }).success).toBe(false);
  });
});

describe('rateRideSchema', () => {
  it('1 dan 5 gacha bahoni qabul qiladi', () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(rateRideSchema.safeParse({ rating }).success).toBe(true);
    }
  });

  it('chegaradan tashqaridagi bahoni rad etadi', () => {
    expect(rateRideSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(rateRideSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(rateRideSchema.safeParse({ rating: 4.5 }).success).toBe(false);
  });
});

describe('driverProfileSchema', () => {
  it("davlat raqamidan bo'shliqni olib tashlaydi va katta harfga o'giradi", () => {
    const result = driverProfileSchema.safeParse({
      carModel: 'Cobalt',
      carColor: 'oq',
      plateNumber: '01 a 777 aa',
      tariff: 'ECONOM',
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.plateNumber).toBe('01A777AA');
  });

  /**
   * Tozalash BO'LMASA, "01 A 777 AA" va "01A777AA" ikki xil yozuv
   * bo'lib qolardi va bazadagi yagona indeks ishlamasdi — bitta
   * mashina ikki haydovchida turishi mumkin edi.
   */
  it("belgi bo'lgan raqamni rad etadi", () => {
    const result = driverProfileSchema.safeParse({
      carModel: 'Cobalt',
      carColor: 'oq',
      plateNumber: '01-A-777',
      tariff: 'ECONOM',
    });

    expect(result.success).toBe(false);
  });
});

describe('rideOffersSchema', () => {
  it('koordinata bilan ishlaydi', () => {
    const result = rideOffersSchema.safeParse({
      latitude: TOSHKENT.lat,
      longitude: TOSHKENT.lng,
    });

    expect(result.success).toBe(true);
  });

  /**
   * Koordinatasiz ham ishlashi SHART.
   *
   * Aks holda buyurtmalar sahifasi boshi berk ko'chaga tushardi:
   * u yerda joylashuv so'raydigan tugma yo'q, shuning uchun brauzer
   * ruxsat so'ramaydi va sahifa abadiy "joylashuv kutilmoqda" deb
   * turardi. Koordinata kelmasa, server bazadagi oxirgi nuqtani
   * ishlatadi.
   */
  it("koordinatasiz ham qabul qilinadi — server bazadagi nuqtani ishlatadi", () => {
    expect(rideOffersSchema.safeParse({}).success).toBe(true);
  });

  it("noto'g'ri koordinata berilsa baribir rad etiladi", () => {
    expect(rideOffersSchema.safeParse({ latitude: 0, longitude: 0 }).success).toBe(false);
  });
});
