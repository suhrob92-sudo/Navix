import { describe, expect, it } from 'vitest';

import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANTS,
  canCancelBooking,
  countNights,
  dateKeyFromToday,
  formatNights,
  formatStars,
  isBookingFinished,
  toDateKey,
  type BookingStatusName,
} from '@/modules/hotel/hotel.types';

const ALL_STATUSES: BookingStatusName[] = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];

describe('countNights — kechalar soni', () => {
  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Mehmonxona KECHALAR uchun pul oladi. 7-avgustda kirib
   * 9-avgustda chiqsa — bu 2 kecha, garchi sanalar uchtaga tegsa
   * ham. Bu klassik "bir birlik farq" xatosi joyi.
   */
  it('7-dan 9-gacha — 2 kecha', () => {
    expect(countNights('2026-08-07', '2026-08-09')).toBe(2);
  });

  it('bir kecha', () => {
    expect(countNights('2026-08-07', '2026-08-08')).toBe(1);
  });

  it("bir xil sana — 0 kecha", () => {
    // Kirish va chiqish bir kunda bo'lsa, yashash yo'q.
    expect(countNights('2026-08-07', '2026-08-07')).toBe(0);
  });

  it('teskari tartib — 0 kecha', () => {
    // Chiqish kirishdan oldin bo'lishi mumkin emas.
    expect(countNights('2026-08-09', '2026-08-07')).toBe(0);
  });

  /**
   * Oy va yil chegarasi — sanani qo'lda hisoblashda eng ko'p xato
   * qilinadigan joy.
   */
  it("oy chegarasidan o'tadi", () => {
    expect(countNights('2026-08-30', '2026-09-02')).toBe(3);
  });

  it("yil chegarasidan o'tadi", () => {
    expect(countNights('2026-12-30', '2027-01-02')).toBe(3);
  });

  it("kabisa yilini to'g'ri sanaydi", () => {
    // 2028 — kabisa yili, fevralda 29 kun bor.
    expect(countNights('2028-02-28', '2028-03-01')).toBe(2);
  });

  it("kabisa bo'lmagan yilda", () => {
    expect(countNights('2026-02-28', '2026-03-01')).toBe(1);
  });

  /**
   * Vaqt zonasi tuzoq: sanalar UTC'da hisoblanishi kerak.
   *
   * Mahalliy vaqtda hisoblansa, Toshkent (UTC+5) da yarim tundan
   * keyin kun bir kunga surilib ketardi.
   */
  it("vaqt qo'shilgan bo'lsa ham to'g'ri sanaydi", () => {
    expect(countNights('2026-08-07T19:00:00.000Z', '2026-08-09T06:00:00.000Z')).toBe(2);
  });

  it("noto'g'ri sanada nol qaytaradi", () => {
    expect(countNights('salom', '2026-08-09')).toBe(0);
  });

  it('uzoq muddat', () => {
    expect(countNights('2026-01-01', '2026-12-31')).toBe(364);
  });
});

describe('toDateKey', () => {
  it("satrdan sanani ajratadi", () => {
    expect(toDateKey('2026-08-07T19:00:00.000Z')).toBe('2026-08-07');
  });

  it('Date obyektidan sanani beradi', () => {
    expect(toDateKey(new Date('2026-08-07T00:00:00.000Z'))).toBe('2026-08-07');
  });

  it("yil oxiridagi kech vaqtda ham UTC sanasi", () => {
    // Mahalliy vaqtda hisoblansa keyingi yilga o'tib ketardi.
    expect(toDateKey(new Date('2026-12-31T23:30:00.000Z'))).toBe('2026-12-31');
  });
});

describe('dateKeyFromToday', () => {
  const today = new Date('2026-08-07T10:00:00.000Z');

  it('bugun', () => {
    expect(dateKeyFromToday(0, today)).toBe('2026-08-07');
  });

  it('ertaga', () => {
    expect(dateKeyFromToday(1, today)).toBe('2026-08-08');
  });

  it("oy chegarasidan o'tadi", () => {
    expect(dateKeyFromToday(25, today)).toBe('2026-09-01');
  });
});

describe('canCancelBooking — bekor qilish mumkinmi', () => {
  const today = new Date('2026-08-07T10:00:00.000Z');

  it('kirishdan oldin mumkin', () => {
    expect(canCancelBooking({ status: 'CONFIRMED', checkIn: '2026-08-10' }, today)).toBe(true);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Mehmon kirgan kuni bekor qilib bo'lmaydi: xona band bo'lgan va
   * boshqa mehmon uni sotib ololmagan.
   */
  it('kirish kuni mumkin emas', () => {
    expect(canCancelBooking({ status: 'CONFIRMED', checkIn: '2026-08-07' }, today)).toBe(false);
  });

  it("kirish kuni o'tgan bo'lsa mumkin emas", () => {
    expect(canCancelBooking({ status: 'CONFIRMED', checkIn: '2026-08-01' }, today)).toBe(false);
  });

  it('allaqachon bekor qilingan bo\'lsa mumkin emas', () => {
    expect(canCancelBooking({ status: 'CANCELLED', checkIn: '2026-08-10' }, today)).toBe(false);
  });

  it("yashab bo'lingan bo'lsa mumkin emas", () => {
    expect(canCancelBooking({ status: 'COMPLETED', checkIn: '2026-08-10' }, today)).toBe(false);
  });
});

describe("ko'rinadigan nomlar", () => {
  it('har bir holat uchun nom va rang bor', () => {
    for (const status of ALL_STATUSES) {
      expect(BOOKING_STATUS_LABELS[status]).toBeTruthy();
      expect(BOOKING_STATUS_VARIANTS[status]).toBeTruthy();
    }
  });

  it('yulduzlarni chizadi', () => {
    expect(formatStars(4)).toBe('★★★★');
    expect(formatStars(5)).toBe('★★★★★');
  });

  it('yulduzlar chegaradan chiqmaydi', () => {
    // Bazadagi buzuq qiymat ekranni buzmasligi kerak.
    expect(formatStars(0)).toBe('');
    expect(formatStars(-2)).toBe('');
    expect(formatStars(99)).toBe('★★★★★');
  });

  it('kechalar sonini yozadi', () => {
    expect(formatNights(2)).toBe('2 kecha');
  });
});

/**
 * Bandlov TUGAGANMI — sana bo'yicha.
 *
 * ── Nima uchun bu sinov muhim ─────────────────────────────────────────
 * Bandlov bazada `CONFIRMED` bo'lib QOLADI: uni `COMPLETED` ga
 * o'tkazadigan fon jarayoni yo'q. Faqat holatga qaralganda ikki yil
 * oldingi bandlov ham "faol" bo'lib hisoblanardi.
 *
 * Bu haqiqiy xatoga olib keldi: hisobni yopish tekshiruvi shunday
 * yozilgan edi va odam hisobini hech qachon yopa olmasdi.
 */
describe('isBookingFinished', () => {
  const now = new Date('2026-08-12T10:00:00.000Z');

  it("kelgusi bandlov — TUGAMAGAN", () => {
    expect(isBookingFinished({ status: 'CONFIRMED', checkOut: '2026-08-20' }, now)).toBe(false);
  });

  it("o'tgan bandlov — TUGAGAN", () => {
    expect(isBookingFinished({ status: 'CONFIRMED', checkOut: '2024-01-05' }, now)).toBe(true);
  });

  /**
   * Chiqish KUNI hali tugamagan — mehmon bugun chiqadi, ya'ni
   * bandlov hali faol.
   */
  it("bugun chiqiladigan bandlov — hali TUGAMAGAN", () => {
    expect(isBookingFinished({ status: 'CONFIRMED', checkOut: '2026-08-12' }, now)).toBe(false);
  });

  it("bekor qilingan va yakunlangan — sanadan qat'i nazar tugagan", () => {
    expect(isBookingFinished({ status: 'CANCELLED', checkOut: '2030-01-01' }, now)).toBe(true);
    expect(isBookingFinished({ status: 'COMPLETED', checkOut: '2030-01-01' }, now)).toBe(true);
  });
});
