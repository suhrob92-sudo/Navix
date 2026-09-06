import { describe, expect, it } from 'vitest';

import { TAXI_DRIVER_SHARE_PERCENT, TAXI_MIN_FARE_SOM, TAXI_TARIFFS } from '@/config/taxi';
import { calculateTaxiFare, isTaxiDistanceAllowed, routeDistanceKm } from '@/modules/taxi/taxi.pricing';

/**
 * Narx — modulning eng nozik joyi, shuning uchun chegaralar
 * alohida-alohida tekshiriladi.
 */

describe('calculateTaxiFare', () => {
  it("baza va kilometr haqini qo'shadi", () => {
    const fare = calculateTaxiFare('ECONOM', 5);

    // 8 000 + 5 * 2 000 = 18 000 so'm
    expect(fare.priceTiyin).toBe(18_000 * 100);
    expect(fare.breakdown.baseSom).toBe(TAXI_TARIFFS.ECONOM.baseSom);
    expect(fare.breakdown.distanceSom).toBe(10_000);
    expect(fare.breakdown.minFareApplied).toBe(false);
  });

  it('qisqa safarda pastki chegarani qo\'llaydi', () => {
    // 8 000 + 0.5 * 2 000 = 9 000 so'm — chegaradan past.
    const fare = calculateTaxiFare('ECONOM', 0.5);

    expect(fare.priceTiyin).toBe(TAXI_MIN_FARE_SOM * 100);
    expect(fare.breakdown.minFareApplied).toBe(true);
  });

  it('Komfort Ekonomdan qimmat', () => {
    const econom = calculateTaxiFare('ECONOM', 10);
    const comfort = calculateTaxiFare('COMFORT', 10);

    expect(comfort.priceTiyin).toBeGreaterThan(econom.priceTiyin);
  });

  it("haydovchi ulushi kelishilgan foizga teng va PASTGA yaxlitlanadi", () => {
    const fare = calculateTaxiFare('ECONOM', 5);

    expect(fare.driverFeeTiyin).toBe(Math.floor((fare.priceTiyin * TAXI_DRIVER_SHARE_PERCENT) / 100));
  });

  /**
   * Bazadagi `taxi_rides_money_sane` cheklovi shuni talab qiladi.
   * Kod cheklovni buzsa, yozuv umuman saqlanmaydi — buni testda
   * ushlaymiz, ishlab chiqarishda emas.
   */
  it("haydovchi ulushi hech qachon umumiy summadan oshmaydi", () => {
    for (const km of [0.3, 1, 2.5, 7, 13.7, 40, 60]) {
      for (const tariff of ['ECONOM', 'COMFORT'] as const) {
        const fare = calculateTaxiFare(tariff, km);

        expect(fare.driverFeeTiyin).toBeLessThanOrEqual(fare.priceTiyin);
        expect(fare.driverFeeTiyin).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("narx butun tiyinda — kasr qoldiq yo'q", () => {
    const fare = calculateTaxiFare('COMFORT', 3.33);

    expect(Number.isInteger(fare.priceTiyin)).toBe(true);
    expect(Number.isInteger(fare.driverFeeTiyin)).toBe(true);
  });

  it('masofa uzayganda narx kamaymaydi', () => {
    let previous = 0;

    for (const km of [0.3, 1, 5, 10, 25, 60]) {
      const fare = calculateTaxiFare('ECONOM', km);

      expect(fare.priceTiyin).toBeGreaterThanOrEqual(previous);
      previous = fare.priceTiyin;
    }
  });
});

describe('routeDistanceKm', () => {
  it("to'g'ri chiziqdan uzunroq natija beradi", () => {
    // Toshkent: Chorsu → Mustaqillik maydoni atrofi.
    const from = { latitude: 41.3255, longitude: 69.2345 };
    const to = { latitude: 41.3111, longitude: 69.2797 };

    const km = routeDistanceKm(from, to);

    expect(km).toBeGreaterThan(0);
    // ROUTE_FACTOR 1.3 — natija to'g'ri chiziqdan katta bo'lishi shart.
    expect(km).toBeGreaterThan(4.3);
    expect(km).toBeLessThan(7);
  });

  it('ikki xonagacha yaxlitlanadi — baza ustuni shuncha saqlaydi', () => {
    const km = routeDistanceKm(
      { latitude: 41.3111, longitude: 69.2797 },
      { latitude: 41.2995, longitude: 69.2401 },
    );

    expect(km).toBe(Math.round(km * 100) / 100);
  });

  it("bir xil nuqta uchun nol beradi", () => {
    const point = { latitude: 41.3111, longitude: 69.2797 };

    expect(routeDistanceKm(point, point)).toBe(0);
  });
});

describe('isTaxiDistanceAllowed', () => {
  it("juda qisqa safarni rad etadi", () => {
    expect(isTaxiDistanceAllowed(0)).toBe(false);
    expect(isTaxiDistanceAllowed(0.1)).toBe(false);
  });

  it("juda uzoq safarni rad etadi — u Sayohat modulining ishi", () => {
    expect(isTaxiDistanceAllowed(61)).toBe(false);
    expect(isTaxiDistanceAllowed(500)).toBe(false);
  });

  it('oddiy shahar safarini qabul qiladi', () => {
    expect(isTaxiDistanceAllowed(0.3)).toBe(true);
    expect(isTaxiDistanceAllowed(8.4)).toBe(true);
    expect(isTaxiDistanceAllowed(60)).toBe(true);
  });

  it("son bo'lmagan qiymatni rad etadi", () => {
    expect(isTaxiDistanceAllowed(Number.NaN)).toBe(false);
    expect(isTaxiDistanceAllowed(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
