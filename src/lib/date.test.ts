import { describe, expect, it } from 'vitest';

import {
  formatRelativeUz,
  formatUzDate,
  formatUzDateTime,
  formatUzTime,
  startOfTashkentDay,
  startOfTashkentDaysAgo,
} from '@/lib/date';

/**
 * Barcha kutilgan natijalar ANIQ yozilgan.
 *
 * Sababi: bu funksiyalar server va brauzerda bir xil ishlashi shart.
 * "Taxminan to'g'ri" tekshiruv aynan shu farqni o'tkazib yuborardi.
 */

// 2026-yil 3-avgust, 06:03 UTC = Toshkentda 11:03
const SAMPLE = '2026-08-03T06:03:00.000Z';

describe('formatUzTime', () => {
  it('Toshkent vaqtini beradi (UTC+5)', () => {
    expect(formatUzTime(SAMPLE)).toBe('11:03');
  });

  it('yarim tundan oshganda kun chegarasini hisobga oladi', () => {
    // 20:30 UTC = ertasi kuni 01:30 Toshkentda
    expect(formatUzTime('2026-08-03T20:30:00.000Z')).toBe('01:30');
  });

  it("bir xonali soat va daqiqani nol bilan to'ldiradi", () => {
    expect(formatUzTime('2026-08-03T00:05:00.000Z')).toBe('05:05');
  });
});

describe('formatUzDate', () => {
  it("qisqa ko'rinish", () => {
    expect(formatUzDate(SAMPLE)).toBe('3-avg');
  });

  it("to'liq ko'rinish", () => {
    expect(formatUzDate(SAMPLE, 'long')).toBe('3-avgust, 2026');
  });

  it('barcha oylar tarjima qilingan', () => {
    const expected = [
      '1-yanvar',
      '1-fevral',
      '1-mart',
      '1-aprel',
      '1-may',
      '1-iyun',
      '1-iyul',
      '1-avgust',
      '1-sentabr',
      '1-oktabr',
      '1-noyabr',
      '1-dekabr',
    ];

    for (let month = 0; month < 12; month += 1) {
      // 06:00 UTC — Toshkentda ham o'sha kun qoladi.
      const iso = `2026-${String(month + 1).padStart(2, '0')}-01T06:00:00.000Z`;
      expect(formatUzDate(iso, 'long')).toBe(`${expected[month]}, 2026`);
    }
  });

  it("yarim tundan keyin ertasi kunni ko'rsatadi", () => {
    // 3-avgust 20:00 UTC = 4-avgust 01:00 Toshkentda
    expect(formatUzDate('2026-08-03T20:00:00.000Z')).toBe('4-avg');
  });
});

describe('formatUzDateTime', () => {
  it('sana va vaqtni birlashtiradi', () => {
    expect(formatUzDateTime(SAMPLE)).toBe('3-avg, 11:03');
    expect(formatUzDateTime(SAMPLE, 'long')).toBe('3-avgust, 2026, 11:03');
  });
});

describe('formatRelativeUz', () => {
  const now = new Date('2026-08-03T12:00:00.000Z');

  it('bir daqiqadan kam', () => {
    expect(formatRelativeUz('2026-08-03T11:59:30.000Z', now)).toBe('Hozir');
  });

  it('daqiqalarda', () => {
    expect(formatRelativeUz('2026-08-03T11:45:00.000Z', now)).toBe('15 daqiqa oldin');
  });

  it("bugun — soat ko'rsatiladi", () => {
    expect(formatRelativeUz('2026-08-03T06:03:00.000Z', now)).toBe('Bugun, 11:03');
  });

  it('kecha', () => {
    expect(formatRelativeUz('2026-08-02T06:03:00.000Z', now)).toBe('Kecha, 11:03');
  });

  it('shu yildagi eskiroq sana', () => {
    expect(formatRelativeUz('2026-07-20T06:03:00.000Z', now)).toBe('20-iyl, 11:03');
  });

  it("o'tgan yil — yil ham ko'rsatiladi", () => {
    expect(formatRelativeUz('2025-12-31T06:03:00.000Z', now)).toBe('31-dekabr, 2025');
  });

  it("kun chegarasini Toshkent bo'yicha hisoblaydi", () => {
    // 2-avgust 20:00 UTC = 3-avgust 01:00 Toshkentda, ya'ni BUGUN.
    expect(formatRelativeUz('2026-08-02T20:00:00.000Z', now)).toBe('Bugun, 01:00');
  });
});

/**
 * Kun chegarasi — admin statistikasining poydevori.
 *
 * "Bugun nechta to'lov bo'ldi?" degan savolga javob server qayerda
 * turgani bilan o'zgarmasligi kerak. Toshkentda soat 01:00 bo'lganda
 * UTC'da hali kecha — agar UTC ishlatilsa, tunda qilingan to'lovlar
 * "kechagi" bo'lib qolardi.
 */
describe('startOfTashkentDay', () => {
  it("Toshkentdagi yarim tunni UTC'da to'g'ri belgilaydi", () => {
    // 3-avgust 11:03 Toshkentda → kun boshi 3-avgust 00:00 Toshkentda
    // → UTC'da 2-avgust 19:00.
    const result = startOfTashkentDay(new Date('2026-08-03T06:03:00.000Z'));

    expect(result.toISOString()).toBe('2026-08-02T19:00:00.000Z');
  });

  it("UTC bo'yicha hali kecha bo'lgan payt ham BUGUNGA kiradi", () => {
    // 2-avgust 20:00 UTC = 3-avgust 01:00 Toshkentda.
    const result = startOfTashkentDay(new Date('2026-08-02T20:00:00.000Z'));

    expect(result.toISOString()).toBe('2026-08-02T19:00:00.000Z');
  });

  it("Toshkent yarim tunining o'zi yangi kunga tegishli", () => {
    const result = startOfTashkentDay(new Date('2026-08-02T19:00:00.000Z'));

    expect(result.toISOString()).toBe('2026-08-02T19:00:00.000Z');
  });

  it('bir soniya oldin — hali eski kun', () => {
    const result = startOfTashkentDay(new Date('2026-08-02T18:59:59.999Z'));

    expect(result.toISOString()).toBe('2026-08-01T19:00:00.000Z');
  });

  it('oy chegarasidan oshib ketmaydi', () => {
    // 1-avgust 02:00 Toshkentda → kun boshi 31-iyul 19:00 UTC.
    const result = startOfTashkentDay(new Date('2026-07-31T21:00:00.000Z'));

    expect(result.toISOString()).toBe('2026-07-31T19:00:00.000Z');
  });
});

describe('startOfTashkentDaysAgo', () => {
  it('aniq shuncha kun orqaga suradi', () => {
    const result = startOfTashkentDaysAgo(7, new Date('2026-08-03T06:03:00.000Z'));

    expect(result.toISOString()).toBe('2026-07-26T19:00:00.000Z');
  });

  it('nol kun — bugungi kun boshi', () => {
    const now = new Date('2026-08-03T06:03:00.000Z');

    expect(startOfTashkentDaysAgo(0, now).toISOString()).toBe(startOfTashkentDay(now).toISOString());
  });
});
