import { describe, expect, it } from 'vitest';

import { BOOKING_RULES } from '@/config/hotels';
import {
  bookingQuerySchema,
  cancelBookingSchema,
  createBookingSchema,
  hotelQuerySchema,
} from '@/modules/hotel/hotel.schemas';
import { dateKeyFromToday } from '@/modules/hotel/hotel.types';

const ROOM_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const VALID = {
  roomId: ROOM_ID,
  checkIn: dateKeyFromToday(1),
  checkOut: dateKeyFromToday(3),
  guests: 2,
  guestName: 'Aziz Karimov',
  guestPhone: '901234567',
  idempotencyKey: 'test-key-12345678',
};

describe('createBookingSchema', () => {
  it("to'g'ri bandlovni qabul qiladi", () => {
    const parsed = createBookingSchema.parse(VALID);

    expect(parsed.roomId).toBe(ROOM_ID);
    expect(parsed.guests).toBe(2);
  });

  it('telefon raqamini E.164 ga aylantiradi', () => {
    expect(createBookingSchema.parse(VALID).guestPhone).toBe('+998901234567');
  });

  /**
   * ENG MUHIM TEKSHIRUV — 1.
   *
   * SUMMA va KECHALAR soni so'rovda bo'lmasligi kerak. Aks holda
   * so'rovni tahrirlab 10 kechani bir kecha narxiga band qilish
   * mumkin bo'lardi.
   */
  it("summani qabul qilmaydi", () => {
    const parsed = createBookingSchema.parse({ ...VALID, totalTiyin: 1, pricePerNight: 1 });

    expect(parsed).not.toHaveProperty('totalTiyin');
    expect(parsed).not.toHaveProperty('pricePerNight');
  });

  it('kechalar sonini qabul qilmaydi', () => {
    const parsed = createBookingSchema.parse({ ...VALID, nights: 1 });

    expect(parsed).not.toHaveProperty('nights');
  });

  it("foydalanuvchi ID'sini qabul qilmaydi", () => {
    const parsed = createBookingSchema.parse({ ...VALID, userId: ROOM_ID });

    expect(parsed).not.toHaveProperty('userId');
  });

  it('holatni qabul qilmaydi', () => {
    const parsed = createBookingSchema.parse({ ...VALID, status: 'COMPLETED' });

    expect(parsed).not.toHaveProperty('status');
  });

  /**
   * ENG MUHIM TEKSHIRUV — 2.
   *
   * Chiqish kirishdan keyin bo'lishi shart, aks holda kechalar soni
   * nol yoki manfiy bo'lardi.
   */
  it('teskari sanalarni rad etadi', () => {
    const result = createBookingSchema.safeParse({
      ...VALID,
      checkIn: dateKeyFromToday(5),
      checkOut: dateKeyFromToday(3),
    });

    expect(result.success).toBe(false);
  });

  it('bir xil sanani rad etadi', () => {
    const same = dateKeyFromToday(2);
    const result = createBookingSchema.safeParse({ ...VALID, checkIn: same, checkOut: same });

    expect(result.success).toBe(false);
  });

  it("o'tmishdagi sanani rad etadi", () => {
    const result = createBookingSchema.safeParse({
      ...VALID,
      checkIn: dateKeyFromToday(-2),
      checkOut: dateKeyFromToday(1),
    });

    expect(result.success).toBe(false);
  });

  it('bugungi sanani qabul qiladi', () => {
    // Bugun kelib qolish mumkin — bu qonuniy holat.
    const result = createBookingSchema.safeParse({
      ...VALID,
      checkIn: dateKeyFromToday(0),
      checkOut: dateKeyFromToday(1),
    });

    expect(result.success).toBe(true);
  });

  it('juda uzoq muddatni rad etadi', () => {
    const result = createBookingSchema.safeParse({
      ...VALID,
      checkIn: dateKeyFromToday(1),
      checkOut: dateKeyFromToday(BOOKING_RULES.maxNights + 5),
    });

    expect(result.success).toBe(false);
  });

  it('juda uzoq kelajakni rad etadi', () => {
    const result = createBookingSchema.safeParse({
      ...VALID,
      checkIn: dateKeyFromToday(BOOKING_RULES.maxDaysAhead + 10),
      checkOut: dateKeyFromToday(BOOKING_RULES.maxDaysAhead + 12),
    });

    expect(result.success).toBe(false);
  });

  it("noto'g'ri sana ko'rinishini rad etadi", () => {
    expect(createBookingSchema.safeParse({ ...VALID, checkIn: '07.08.2026' }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...VALID, checkIn: '2026-13-45' }).success).toBe(false);
  });

  it("vaqt qo'shilgan sanani rad etadi", () => {
    // Faqat sana kutamiz: vaqt bilan kelsa, vaqt zonasi aralashardi.
    expect(createBookingSchema.safeParse({ ...VALID, checkIn: '2026-08-07T10:00:00Z' }).success).toBe(false);
  });

  it('mehmonlar sonini tekshiradi', () => {
    expect(createBookingSchema.safeParse({ ...VALID, guests: 0 }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...VALID, guests: BOOKING_RULES.maxGuests + 1 }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...VALID, guests: 1.5 }).success).toBe(false);
  });

  it('mehmon ismini talab qiladi', () => {
    expect(createBookingSchema.safeParse({ ...VALID, guestName: 'A' }).success).toBe(false);
  });

  it("noto'g'ri telefonni rad etadi", () => {
    expect(createBookingSchema.safeParse({ ...VALID, guestPhone: '123' }).success).toBe(false);
  });
});

describe('hotelQuerySchema', () => {
  it('standart tartib — tavsiya', () => {
    expect(hotelQuerySchema.parse({}).sort).toBe('popular');
  });

  it('filtrlarni qabul qiladi', () => {
    const parsed = hotelQuerySchema.parse({ search: ' Samarqand ', city: 'Buxoro', sort: 'price' });

    expect(parsed.search).toBe('Samarqand');
    expect(parsed.city).toBe('Buxoro');
    expect(parsed.sort).toBe('price');
  });

  it("narx chegarasini so'mda qabul qiladi", () => {
    expect(hotelQuerySchema.parse({ maxPriceSom: '500000' }).maxPriceSom).toBe(500_000);
  });

  it("noma'lum tartibni rad etadi", () => {
    expect(hotelQuerySchema.safeParse({ sort: 'random' }).success).toBe(false);
  });
});

describe('bookingQuerySchema', () => {
  it('standart filtr — barchasi', () => {
    expect(bookingQuerySchema.parse({}).status).toBe('ALL');
  });

  it('kelgusi bandlovlarni alohida so\'rashga ruxsat beradi', () => {
    expect(bookingQuerySchema.parse({ status: 'UPCOMING' }).status).toBe('UPCOMING');
  });

  /**
   * `userId` so'rovda qabul qilinsa, begona bandlovlarni — mehmon
   * ismi va telefoni bilan — o'qib olish mumkin bo'lardi.
   */
  it("foydalanuvchi ID'sini qabul qilmaydi", () => {
    const parsed = bookingQuerySchema.parse({ userId: ROOM_ID });

    expect(parsed).not.toHaveProperty('userId');
  });
});

describe('cancelBookingSchema', () => {
  it('sababsiz bekor qilishga ruxsat beradi', () => {
    expect(cancelBookingSchema.safeParse({}).success).toBe(true);
  });

  it('sababni tozalaydi', () => {
    expect(cancelBookingSchema.parse({ reason: '  Rejam o\'zgardi  ' }).reason).toBe("Rejam o'zgardi");
  });

  it('juda uzun sababni rad etadi', () => {
    expect(cancelBookingSchema.safeParse({ reason: 'a'.repeat(256) }).success).toBe(false);
  });
});
