import { describe, expect, it } from 'vitest';

import { TRIP_RULES } from '@/config/travel';
import {
  cancelTicketSchema,
  createTicketSchema,
  ticketQuerySchema,
  tripDetailQuerySchema,
  tripQuerySchema,
} from '@/modules/travel/travel.schemas';
import { dateKeyFromToday } from '@/lib/date';

const SCHEDULE_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const VALID = {
  scheduleId: SCHEDULE_ID,
  departDate: dateKeyFromToday(2),
  seats: 2,
  passengerName: 'Aziz Karimov',
  passengerPhone: '901234567',
  idempotencyKey: 'test-key-12345678',
};

describe('createTicketSchema', () => {
  it("to'g'ri chiptani qabul qiladi", () => {
    const parsed = createTicketSchema.parse(VALID);

    expect(parsed.scheduleId).toBe(SCHEDULE_ID);
    expect(parsed.seats).toBe(2);
  });

  it('telefon raqamini E.164 ga aylantiradi', () => {
    expect(createTicketSchema.parse(VALID).passengerPhone).toBe('+998901234567');
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * SUMMA so'rovda bo'lmasligi kerak. Aks holda so'rovni tahrirlab
   * olti o'rinni bitta o'rin narxiga sotib olish mumkin bo'lardi.
   */
  it('summani qabul qilmaydi', () => {
    const parsed = createTicketSchema.parse({ ...VALID, totalTiyin: 1, pricePerSeat: 1 });

    expect(parsed).not.toHaveProperty('totalTiyin');
    expect(parsed).not.toHaveProperty('pricePerSeat');
  });

  it("jo'nash vaqtini qabul qilmaydi", () => {
    // Vaqt jadvaldan olinadi: mijoz uni tanlay olsa, allaqachon
    // ketgan reysga chipta yozdirib olishi mumkin bo'lardi.
    const parsed = createTicketSchema.parse({ ...VALID, departAt: '2020-01-01T00:00:00Z' });

    expect(parsed).not.toHaveProperty('departAt');
  });

  it("foydalanuvchi ID'sini qabul qilmaydi", () => {
    const parsed = createTicketSchema.parse({ ...VALID, userId: SCHEDULE_ID });

    expect(parsed).not.toHaveProperty('userId');
  });

  it('holatni qabul qilmaydi', () => {
    const parsed = createTicketSchema.parse({ ...VALID, status: 'COMPLETED' });

    expect(parsed).not.toHaveProperty('status');
  });

  it("o'tgan kunni rad etadi", () => {
    expect(createTicketSchema.safeParse({ ...VALID, departDate: dateKeyFromToday(-1) }).success).toBe(false);
  });

  it('bugungi kunni qabul qiladi', () => {
    // Bugungi reys hali ketmagan bo'lishi mumkin — aniq soat serverda
    // tekshiriladi.
    expect(createTicketSchema.safeParse({ ...VALID, departDate: dateKeyFromToday(0) }).success).toBe(true);
  });

  it('juda uzoq kelajakni rad etadi', () => {
    const far = dateKeyFromToday(TRIP_RULES.maxDaysAhead + 5);

    expect(createTicketSchema.safeParse({ ...VALID, departDate: far }).success).toBe(false);
  });

  it("noto'g'ri sana ko'rinishini rad etadi", () => {
    expect(createTicketSchema.safeParse({ ...VALID, departDate: '10.08.2026' }).success).toBe(false);
    expect(createTicketSchema.safeParse({ ...VALID, departDate: '2026-13-45' }).success).toBe(false);
  });

  it("vaqt qo'shilgan sanani rad etadi", () => {
    expect(createTicketSchema.safeParse({ ...VALID, departDate: '2026-08-10T10:00:00Z' }).success).toBe(false);
  });

  it("o'rinlar sonini tekshiradi", () => {
    expect(createTicketSchema.safeParse({ ...VALID, seats: 0 }).success).toBe(false);
    expect(createTicketSchema.safeParse({ ...VALID, seats: TRIP_RULES.maxSeats + 1 }).success).toBe(false);
    expect(createTicketSchema.safeParse({ ...VALID, seats: 1.5 }).success).toBe(false);
  });

  it("yo'lovchi ismini talab qiladi", () => {
    expect(createTicketSchema.safeParse({ ...VALID, passengerName: 'A' }).success).toBe(false);
  });

  it("noto'g'ri telefonni rad etadi", () => {
    expect(createTicketSchema.safeParse({ ...VALID, passengerPhone: '123' }).success).toBe(false);
  });

  it('qisqa idempotentlik kalitini rad etadi', () => {
    expect(createTicketSchema.safeParse({ ...VALID, idempotencyKey: 'qisqa' }).success).toBe(false);
  });
});

describe('tripQuerySchema', () => {
  const QUERY = { from: 'Toshkent', to: 'Samarqand', date: dateKeyFromToday(1) };

  it("to'g'ri so'rovni qabul qiladi", () => {
    const parsed = tripQuerySchema.parse(QUERY);

    expect(parsed.from).toBe('Toshkent');
    expect(parsed.sort).toBe('time');
  });

  it('bir xil shaharlarni rad etadi', () => {
    expect(tripQuerySchema.safeParse({ ...QUERY, to: 'Toshkent' }).success).toBe(false);
  });

  it("bir xil shaharni katta-kichik harfdan qat'i nazar rad etadi", () => {
    expect(tripQuerySchema.safeParse({ ...QUERY, to: 'TOSHKENT' }).success).toBe(false);
  });

  it('transport turini tekshiradi', () => {
    expect(tripQuerySchema.parse({ ...QUERY, transport: 'TRAIN' }).transport).toBe('TRAIN');
    expect(tripQuerySchema.safeParse({ ...QUERY, transport: 'RAKETA' }).success).toBe(false);
  });

  it("noma'lum tartibni rad etadi", () => {
    expect(tripQuerySchema.safeParse({ ...QUERY, sort: 'random' }).success).toBe(false);
  });

  it('shahar berilmasa rad etadi', () => {
    expect(tripQuerySchema.safeParse({ to: 'Samarqand', date: dateKeyFromToday(1) }).success).toBe(false);
    expect(tripQuerySchema.safeParse({ from: 'Toshkent', date: dateKeyFromToday(1) }).success).toBe(false);
  });

  it('sana berilmasa rad etadi', () => {
    expect(tripQuerySchema.safeParse({ from: 'Toshkent', to: 'Samarqand' }).success).toBe(false);
  });
});

describe('tripDetailQuerySchema', () => {
  it('sanani talab qiladi', () => {
    expect(tripDetailQuerySchema.safeParse({}).success).toBe(false);
    expect(tripDetailQuerySchema.safeParse({ date: dateKeyFromToday(1) }).success).toBe(true);
  });
});

describe('ticketQuerySchema', () => {
  it('standart filtr — barchasi', () => {
    expect(ticketQuerySchema.parse({}).status).toBe('ALL');
  });

  /**
   * `userId` so'rovda qabul qilinsa, begona chiptalarni — yo'lovchi
   * ismi va telefoni bilan — o'qib olish mumkin bo'lardi.
   */
  it("foydalanuvchi ID'sini qabul qilmaydi", () => {
    expect(ticketQuerySchema.parse({ userId: SCHEDULE_ID })).not.toHaveProperty('userId');
  });
});

describe('cancelTicketSchema', () => {
  it('sababsiz bekor qilishga ruxsat beradi', () => {
    expect(cancelTicketSchema.safeParse({}).success).toBe(true);
  });

  it('sababni tozalaydi', () => {
    expect(cancelTicketSchema.parse({ reason: "  Rejam o'zgardi  " }).reason).toBe("Rejam o'zgardi");
  });

  it('juda uzun sababni rad etadi', () => {
    expect(cancelTicketSchema.safeParse({ reason: 'a'.repeat(256) }).success).toBe(false);
  });
});
