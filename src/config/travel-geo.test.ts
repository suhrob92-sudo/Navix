import { describe, expect, it } from 'vitest';

import { CITY_POINTS, TRAVEL_CITIES, cityPoint } from '@/config/travel';
import { distanceKm } from '@/config/delivery-eta';

/**
 * Shahar koordinatalari — testlar.
 *
 * Xaritadagi noto'g'ri nuqta yo'nalishni butunlay boshqa tomonga
 * qaratardi.
 */

describe("shaharlar ro'yxati", () => {
  it('filtrdagi HAR BIR shaharning koordinatasi bor', () => {
    /**
     * Koordinatasiz shahar tanlangan bo'lsa, xarita bo'sh qolardi.
     * Bu test ro'yxatlar bir-biridan ajralib ketishining oldini
     * oladi.
     */
    const missing = TRAVEL_CITIES.filter((city) => cityPoint(city) === null);

    expect(missing).toEqual([]);
  });

  it("noma'lum shahar uchun null", () => {
    // Taxminiy nuqta odamni boshqa tomonga qaratardi.
    expect(cityPoint('Parij')).toBeNull();
  });
});

describe('koordinatalar haqiqiy', () => {
  it("hammasi O'ZBEKISTON chegarasida", () => {
    for (const [city, point] of Object.entries(CITY_POINTS)) {
      expect(point.latitude, city).toBeGreaterThan(37);
      expect(point.latitude, city).toBeLessThan(46);
      expect(point.longitude, city).toBeGreaterThan(55);
      expect(point.longitude, city).toBeLessThan(74);
    }
  });

  it('Toshkent — Samarqand taxminan 270 km', () => {
    const distance = distanceKm(CITY_POINTS.Toshkent, CITY_POINTS.Samarqand);

    expect(distance).toBeGreaterThan(250);
    expect(distance).toBeLessThan(290);
  });

  it('Toshkent — Nukus taxminan 750 km', () => {
    const distance = distanceKm(CITY_POINTS.Toshkent, CITY_POINTS.Nukus);

    expect(distance).toBeGreaterThan(700);
    expect(distance).toBeLessThan(820);
  });

  it('Xiva bilan Urganch YAQIN', () => {
    // Ular qo'shni shaharlar — 30 km atrofida.
    expect(distanceKm(CITY_POINTS.Xiva, CITY_POINTS.Urganch)).toBeLessThan(50);
  });

  it('nuqtalar TAKRORLANMAYDI', () => {
    const keys = Object.values(CITY_POINTS).map((point) => `${point.latitude},${point.longitude}`);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
