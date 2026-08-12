import { describe, expect, it } from 'vitest';

import { TRIP_RULES } from '@/config/travel';
import {
  arrivalAt,
  calculateRefundTiyin,
  isTicketFinished,
  canCancelTicket,
  departureAt,
  formatDuration,
  formatSeats,
  refundPolicyText,
  runsOnDate,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_VARIANTS,
  transportColor,
  transportLabel,
  type TicketStatusName,
} from '@/modules/travel/travel.types';

describe('departureAt', () => {
  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Jadvalda "08:20" yozilgan — bu TOSHKENT vaqti. Server Frankfurtda
   * tursa ham natija bir xil bo'lishi shart, aks holda reys vaqti
   * qurilmaga qarab siljib ketardi.
   */
  it("Toshkent vaqtini to'g'ri o'giradi", () => {
    expect(departureAt('2026-08-10', '08:20').toISOString()).toBe('2026-08-10T03:20:00.000Z');
  });

  it('yarim tundan keyingi reys oldingi kunga UTC da tushadi', () => {
    // Toshkentda 10-avgust 02:00 — bu UTC bo'yicha 9-avgust 21:00.
    expect(departureAt('2026-08-10', '02:00').toISOString()).toBe('2026-08-09T21:00:00.000Z');
  });
});

describe('arrivalAt', () => {
  it("yo'l davomiyligini qo'shadi", () => {
    const depart = departureAt('2026-08-10', '08:00');

    expect(arrivalAt(depart, 130).toISOString()).toBe('2026-08-10T05:10:00.000Z');
  });

  it("kechasi jo'nagan reys ertasi kuni yetib boradi", () => {
    const depart = departureAt('2026-08-10', '20:10');

    // 855 daqiqa = 14 soat 15 daqiqa → Toshkentda 11-avgust 10:25.
    expect(arrivalAt(depart, 855).toISOString()).toBe('2026-08-11T05:25:00.000Z');
  });
});

describe('runsOnDate', () => {
  it("hafta kunini ISO qoidasi bo'yicha tekshiradi", () => {
    // 2026-08-10 — dushanba.
    expect(runsOnDate([1], '2026-08-10')).toBe(true);
    expect(runsOnDate([2, 4, 6], '2026-08-10')).toBe(false);
  });

  it('yakshanba 7 deb hisoblanadi', () => {
    // 2026-08-09 — yakshanba. JavaScript uni 0 deb beradi.
    expect(runsOnDate([7], '2026-08-09')).toBe(true);
    expect(runsOnDate([0], '2026-08-09')).toBe(false);
  });
});

describe('canCancelTicket', () => {
  const now = new Date('2026-08-10T00:00:00Z');

  it("jo'nashdan oldin mumkin", () => {
    expect(canCancelTicket({ status: 'CONFIRMED', departAt: '2026-08-10T03:20:00Z' }, now)).toBe(true);
  });

  it("jo'nab ketgan reysda mumkin emas", () => {
    expect(canCancelTicket({ status: 'CONFIRMED', departAt: '2026-08-09T03:20:00Z' }, now)).toBe(false);
  });

  it("bekor qilingan chiptani qayta bekor qilib bo'lmaydi", () => {
    expect(canCancelTicket({ status: 'CANCELLED', departAt: '2026-08-12T03:20:00Z' }, now)).toBe(false);
  });

  it("o'tib bo'lgan chiptada mumkin emas", () => {
    expect(canCancelTicket({ status: 'COMPLETED', departAt: '2026-08-12T03:20:00Z' }, now)).toBe(false);
  });
});

describe('calculateRefundTiyin', () => {
  const now = new Date('2026-08-10T00:00:00Z');
  const total = 42_000_000n;

  /**
   * ENG MUHIM TEKSHIRUV — PUL.
   *
   * Bu hisob IKKI joyda ishlatiladi: brauzer tasdiqlash oynasida
   * ko'rsatadi, server esa hamyonga qaytaradi. Ular farq qilsa,
   * ekranda bitta summa turib, hamyonga boshqasi tushardi.
   */
  it("jo'nashgacha ko'p vaqt bo'lsa to'liq qaytaradi", () => {
    // 48 soat qolgan.
    expect(calculateRefundTiyin(total, '2026-08-12T00:00:00Z', now)).toBe(total);
  });

  it("chegara aynan chegarada to'liq hisoblanadi", () => {
    const edge = new Date(now.getTime() + TRIP_RULES.fullRefundHours * 3_600_000);

    expect(calculateRefundTiyin(total, edge, now)).toBe(total);
  });

  it('kech bekor qilinsa jarima ushlaydi', () => {
    // 3 soat qolgan.
    expect(calculateRefundTiyin(total, '2026-08-10T03:00:00Z', now)).toBe(21_000_000n);
  });

  it("jo'nab ketgan reysda nol qaytaradi", () => {
    expect(calculateRefundTiyin(total, '2026-08-09T23:00:00Z', now)).toBe(0n);
  });

  it("aynan jo'nash paytida nol qaytaradi", () => {
    expect(calculateRefundTiyin(total, now, now)).toBe(0n);
  });

  /**
   * Tiyinning yarmi paydo bo'lmasligi kerak: qaytariladigan summa
   * PASTGA yaxlitlanadi va hech qachon to'langanidan oshmaydi.
   */
  it('toq summani pastga yaxlitlaydi', () => {
    expect(calculateRefundTiyin(101n, '2026-08-10T03:00:00Z', now)).toBe(50n);
  });

  it("qaytarilgan summa hech qachon to'langanidan oshmaydi", () => {
    for (const amount of [1n, 7n, 999n, 123_456_789n]) {
      expect(calculateRefundTiyin(amount, '2026-08-10T03:00:00Z', now) <= amount).toBe(true);
    }
  });
});

describe('formatDuration', () => {
  it('soat va daqiqani yozadi', () => {
    expect(formatDuration(130)).toBe('2 soat 10 daqiqa');
  });

  it("soat butun bo'lsa daqiqani yozmaydi", () => {
    expect(formatDuration(180)).toBe('3 soat');
  });

  it("bir soatdan kam bo'lsa faqat daqiqa", () => {
    expect(formatDuration(45)).toBe('45 daqiqa');
  });

  it('manfiy sonni nolga tenglaydi', () => {
    expect(formatDuration(-10)).toBe('0 daqiqa');
  });
});

describe('formatSeats', () => {
  it("o'rinlar sonini yozadi", () => {
    expect(formatSeats(2)).toBe("2 o'rin");
  });
});

describe('transportLabel / transportColor', () => {
  it('har bir tur uchun nom va rang bor', () => {
    for (const transport of ['PLANE', 'TRAIN', 'BUS'] as const) {
      expect(transportLabel(transport).length).toBeGreaterThan(2);
      expect(transportColor(transport).length).toBeGreaterThan(2);
    }
  });
});

describe('refundPolicyText', () => {
  /**
   * Matn qoidadagi SONLARDAN yasaladi. Qoida o'zgarganda matn ham
   * o'zgarishi shart, aks holda foydalanuvchiga yolg'on va'da
   * berilardi.
   */
  it('qoidadagi sonlarni ishlatadi', () => {
    const text = refundPolicyText();

    expect(text).toContain(String(TRIP_RULES.fullRefundHours));
    expect(text).toContain(String(TRIP_RULES.lateRefundPercent));
  });
});

describe('holat nomlari', () => {
  it("har bir holat uchun nom va ko'rinish bor", () => {
    for (const status of ['CONFIRMED', 'COMPLETED', 'CANCELLED'] as TicketStatusName[]) {
      expect(TICKET_STATUS_LABELS[status]).toBeTruthy();
      expect(TICKET_STATUS_VARIANTS[status]).toBeTruthy();
    }
  });
});

/**
 * Chipta TUGAGANMI — sana bo'yicha.
 *
 * `isBookingFinished` bilan bir xil sabab: chipta bazada `CONFIRMED`
 * bo'lib qoladi va "safar bo'ldimi" degan savolga faqat sana javob
 * beradi.
 */
describe('isTicketFinished', () => {
  const now = new Date('2026-08-12T10:00:00.000Z');

  it("kelgusi reys — TUGAMAGAN", () => {
    expect(isTicketFinished({ status: 'CONFIRMED', departAt: '2026-08-20T08:00:00Z' }, now)).toBe(false);
  });

  it("jo'nab ketgan reys — TUGAGAN", () => {
    expect(isTicketFinished({ status: 'CONFIRMED', departAt: '2026-08-12T09:00:00Z' }, now)).toBe(true);
  });

  it('bekor qilingan — sanadan qat’i nazar tugagan', () => {
    expect(isTicketFinished({ status: 'CANCELLED', departAt: '2030-01-01T00:00:00Z' }, now)).toBe(true);
  });
});
