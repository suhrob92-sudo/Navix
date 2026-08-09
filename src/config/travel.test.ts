import { describe, expect, it } from 'vitest';

import { TRANSPORT_META, TRAVEL_CITIES, TRIP_RULES, TRIP_SCHEDULES } from '@/config/travel';

/**
 * Jadval — foydalanuvchi ko'radigan ma'lumot manbai. Undagi xato
 * (masalan noto'g'ri hafta kuni yoki bo'sh yo'nalish) sahifada
 * "reys topilmadi" bo'lib chiqadi va sababini topish qiyin bo'ladi.
 * Shuning uchun ro'yxatning o'zi tekshiriladi.
 */
describe('TRIP_SCHEDULES', () => {
  it('reys raqamlari takrorlanmaydi', () => {
    const codes = TRIP_SCHEDULES.map((trip) => trip.code);

    expect(new Set(codes).size).toBe(codes.length);
  });

  it("jo'nash va borish shahri har doim boshqa", () => {
    for (const trip of TRIP_SCHEDULES) {
      expect(trip.fromCity).not.toBe(trip.toCity);
    }
  });

  it("barcha shaharlar ro'yxatda bor", () => {
    const known = new Set<string>(TRAVEL_CITIES);

    for (const trip of TRIP_SCHEDULES) {
      expect(known.has(trip.fromCity), `${trip.code}: ${trip.fromCity}`).toBe(true);
      expect(known.has(trip.toCity), `${trip.code}: ${trip.toCity}`).toBe(true);
    }
  });

  it("jo'nash vaqti HH:MM ko'rinishida va haqiqiy", () => {
    for (const trip of TRIP_SCHEDULES) {
      expect(trip.departTime, trip.code).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    }
  });

  it('hafta kunlari 1 dan 7 gacha va takrorlanmaydi', () => {
    for (const trip of TRIP_SCHEDULES) {
      expect(trip.weekdays.length, trip.code).toBeGreaterThan(0);
      expect(new Set(trip.weekdays).size, trip.code).toBe(trip.weekdays.length);

      for (const day of trip.weekdays) {
        expect(day, trip.code).toBeGreaterThanOrEqual(1);
        expect(day, trip.code).toBeLessThanOrEqual(7);
      }
    }
  });

  it("narx va o'rinlar soni musbat", () => {
    for (const trip of TRIP_SCHEDULES) {
      expect(trip.priceSom, trip.code).toBeGreaterThan(0);
      expect(Number.isInteger(trip.priceSom), trip.code).toBe(true);
      expect(trip.totalSeats, trip.code).toBeGreaterThan(0);
      expect(trip.durationMinutes, trip.code).toBeGreaterThan(0);
    }
  });

  it('har bir transport turi uchun kamida bitta reys bor', () => {
    for (const transport of ['PLANE', 'TRAIN', 'BUS'] as const) {
      expect(
        TRIP_SCHEDULES.some((trip) => trip.transport === transport),
        transport,
      ).toBe(true);
    }
  });

  it('har bir transport turining nomi va rangi belgilangan', () => {
    for (const trip of TRIP_SCHEDULES) {
      expect(TRANSPORT_META[trip.transport], trip.code).toBeDefined();
    }
  });
});

describe('TRIP_RULES', () => {
  it('qaytarish foizi 0 va 100 orasida', () => {
    expect(TRIP_RULES.lateRefundPercent).toBeGreaterThan(0);
    expect(TRIP_RULES.lateRefundPercent).toBeLessThanOrEqual(100);
  });

  it('chegaralar mantiqiy', () => {
    expect(TRIP_RULES.maxSeats).toBeGreaterThan(0);
    expect(TRIP_RULES.maxDaysAhead).toBeGreaterThan(0);
    expect(TRIP_RULES.fullRefundHours).toBeGreaterThan(0);
  });
});
