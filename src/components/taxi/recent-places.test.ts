import { describe, expect, it } from 'vitest';

import { recentDestinations } from '@/components/taxi/recent-places';
import type { RideView } from '@/modules/taxi/taxi.types';

/**
 * Ro'yxat mantiqini SOF funksiyada saqlash shuning uchun:
 * uni brauzersiz, komponentni chizmasdan sinash mumkin.
 */

function ride(address: string, latitude = 41.31, longitude = 69.28): RideView {
  return {
    id: `${address}-${latitude}`,
    rideNumber: 'NVX-T-20260907-A1B2C3',
    status: 'COMPLETED',
    tariff: 'ECONOM',
    from: { latitude: 41.3, longitude: 69.2, address: 'Boshlanish' },
    to: { latitude, longitude, address },
    distanceKm: 5,
    priceTiyin: 1_800_000,
    driver: null,
    driverLocation: null,
    rider: { name: 'Sinov Foydalanuvchi', phone: '+998901112233' },
    rating: null,
    cancelReason: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    acceptedAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
  };
}

describe('recentDestinations', () => {
  it('safar tarixidan manzillarni oladi', () => {
    const places = recentDestinations([ride('Chorsu'), ride('Oybek')]);

    expect(places.map((place) => place.address)).toEqual(['Chorsu', 'Oybek']);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Odam ishga kuniga ikki marta boradi. Takror olib tashlanmasa,
   * ro'yxat o'sha bitta manzilning to'rtta nusxasidan iborat
   * bo'lardi va foydasi qolmasdi.
   */
  it('bir xil manzilni takrorlamaydi', () => {
    const places = recentDestinations([
      ride('Ish'),
      ride('Ish'),
      ride('Uy'),
      ride('Ish'),
    ]);

    expect(places.map((place) => place.address)).toEqual(['Ish', 'Uy']);
  });

  it("katta-kichik harf va bo'shliq farqini hisobga olmaydi", () => {
    const places = recentDestinations([ride('Chorsu'), ride('  chorsu  ')]);

    expect(places).toHaveLength(1);
  });

  it('chegaradan oshmaydi', () => {
    const rides = ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => ride(name));

    expect(recentDestinations(rides)).toHaveLength(4);
    expect(recentDestinations(rides, 2)).toHaveLength(2);
  });

  it("bo'sh nomli manzilni tashlab ketadi", () => {
    const places = recentDestinations([ride('   '), ride('Chorsu')]);

    expect(places.map((place) => place.address)).toEqual(['Chorsu']);
  });

  it("tarix bo'sh bo'lsa bo'sh ro'yxat qaytaradi", () => {
    expect(recentDestinations([])).toEqual([]);
  });

  it('koordinatani ham olib qoladi — xaritada shu nuqta ishlatiladi', () => {
    const places = recentDestinations([ride('Chorsu', 41.3255, 69.2345)]);

    expect(places[0].latitude).toBe(41.3255);
    expect(places[0].longitude).toBe(69.2345);
  });
});
