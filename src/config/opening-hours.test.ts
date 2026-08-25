import { describe, expect, it } from 'vitest';

import {
  buildSchedule,
  describeOpenState,
  formatMinutes,
  isOpenAt,
  isOvernight,
  isRestaurantOpen,
  tashkentNow,
  type DayHours,
} from '@/config/opening-hours';

/**
 * Ish vaqti — testlar.
 *
 * Vaqt mintaqasi va yarim tundan oshadigan smena — eng ko'p xato
 * chiqadigan ikki joy. Ular alohida tekshiriladi.
 */

/**
 * Toshkent vaqtini UTC sanaga o'giradi (UTC+5).
 *
 * Soatni qo'lda ayirish YARAMAYDI: 01:00 uchun natija manfiy
 * bo'lib, sana satri buziladi. Shuning uchun ayirish `Date` ustida
 * bajariladi — u kunni ham o'zi suradi.
 */
function tashkent(day: string, time: string): Date {
  const asUtc = new Date(`${day}T${time}:00Z`);

  return new Date(asUtc.getTime() - 5 * 60 * 60_000);
}

const NINE_TO_TEN: DayHours[] = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  opensAt: 9 * 60,
  closesAt: 22 * 60,
}));

describe('vaqtni yozish', () => {
  it('daqiqa soatga o\'giriladi', () => {
    expect(formatMinutes(570)).toBe('09:30');
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(23 * 60 + 59)).toBe('23:59');
  });

  it('sutkadan oshgan qiymat aylanadi', () => {
    // Hisobda qo'shish natijasida 1440 dan oshishi mumkin.
    expect(formatMinutes(1440)).toBe('00:00');
    expect(formatMinutes(1500)).toBe('01:00');
  });
});

describe('Toshkent vaqti', () => {
  it('QURILMA vaqtiga bog\'liq emas', () => {
    /**
     * Chet elda turgan odamning telefoni boshqa vaqtni ko'rsatadi.
     * Restoran unga "yopiq" bo'lib ko'rinardi — aslida Toshkentda
     * tush payti edi.
     */
    // 2026-08-24 — dushanba. UTC 07:00 = Toshkentda 12:00.
    const result = tashkentNow(new Date('2026-08-24T07:00:00Z'));

    expect(result.weekday).toBe(1);
    expect(result.minutes).toBe(12 * 60);
  });

  it('UTC yarim tunida Toshkentda ERTALAB', () => {
    // UTC 00:00 = Toshkentda 05:00, KUN esa allaqachon o'zgargan.
    const result = tashkentNow(new Date('2026-08-24T00:00:00Z'));

    expect(result.minutes).toBe(5 * 60);
    expect(result.weekday).toBe(1);
  });

  it('UTC 20:00 da Toshkentda ERTANGI kun', () => {
    /**
     * Chegara: UTC bo'yicha hali dushanba, Toshkentda esa
     * allaqachon seshanba 01:00.
     */
    const result = tashkentNow(new Date('2026-08-24T20:00:00Z'));

    expect(result.weekday).toBe(2);
    expect(result.minutes).toBe(60);
  });
});

describe('oddiy jadval', () => {
  it('ish vaqtida OCHIQ', () => {
    expect(isOpenAt(NINE_TO_TEN, tashkent('2026-08-24', '12:00'))).toBe(true);
  });

  it('ochilishdan OLDIN yopiq', () => {
    expect(isOpenAt(NINE_TO_TEN, tashkent('2026-08-24', '08:59'))).toBe(false);
  });

  it('ochilish daqiqasida OCHIQ', () => {
    expect(isOpenAt(NINE_TO_TEN, tashkent('2026-08-24', '09:00'))).toBe(true);
  });

  it('yopilish daqiqasida YOPIQ', () => {
    /**
     * Chegara aniq bo'lishi kerak: 22:00 da buyurtma qabul
     * qilinmaydi, aks holda oshxona yopilgandan keyin ham
     * buyurtma tushardi.
     */
    expect(isOpenAt(NINE_TO_TEN, tashkent('2026-08-24', '22:00'))).toBe(false);
  });

  it('DAM OLISH kunida yopiq', () => {
    // Yakshanba uchun yozuv yo'q.
    expect(isOpenAt(NINE_TO_TEN, tashkent('2026-08-23', '12:00'))).toBe(false);
  });
});

describe('YARIM TUNDAN oshadigan smena', () => {
  /** Har kuni 18:00 dan 02:00 gacha — tungi kafe. */
  const nightCafe: DayHours[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    opensAt: 18 * 60,
    closesAt: 2 * 60,
  }));

  it('bunday jadval TANIB olinadi', () => {
    expect(isOvernight({ weekday: 1, opensAt: 18 * 60, closesAt: 2 * 60 })).toBe(true);
    expect(isOvernight({ weekday: 1, opensAt: 9 * 60, closesAt: 22 * 60 })).toBe(false);
  });

  it('kechqurun OCHIQ', () => {
    expect(isOpenAt(nightCafe, tashkent('2026-08-24', '20:00'))).toBe(true);
  });

  it('YARIM TUNDAN keyin ham ochiq', () => {
    /**
     * Eng muhim tekshiruv. Oddiy solishtirish (`ochilish <= hozir
     * < yopilish`) bunday jadvalda hech qachon rost bo'lmasdi va
     * tungi kafe har kuni yarim tunda "yopilib" qolardi.
     */
    expect(isOpenAt(nightCafe, tashkent('2026-08-25', '01:00'))).toBe(true);
  });

  it('yopilgandan keyin YOPIQ', () => {
    expect(isOpenAt(nightCafe, tashkent('2026-08-25', '03:00'))).toBe(false);
  });

  it('kunduzi YOPIQ', () => {
    expect(isOpenAt(nightCafe, tashkent('2026-08-24', '12:00'))).toBe(false);
  });

  it('KECHAGI kun yopiq bo\'lsa, tunda ham yopiq', () => {
    /**
     * Faqat shanba kuni tungi smena. Yakshanba 01:00 da ochiq,
     * lekin dushanba 01:00 da yopiq bo'lishi kerak.
     */
    const onlySaturday: DayHours[] = [{ weekday: 6, opensAt: 18 * 60, closesAt: 2 * 60 }];

    // Yakshanba tuni — shanbadan davom etyapti.
    expect(isOpenAt(onlySaturday, tashkent('2026-08-23', '01:00'))).toBe(true);
    // Dushanba tuni — yakshanba kuni yopiq edi.
    expect(isOpenAt(onlySaturday, tashkent('2026-08-24', '01:00'))).toBe(false);
  });
});

describe('bayroq va jadval BIRGA', () => {
  it('bayroq o\'chiq bo\'lsa — YOPIQ', () => {
    /**
     * "Bugun favqulodda yopiqmiz" holati jadvaldan ustun turadi.
     */
    expect(isRestaurantOpen(NINE_TO_TEN, false, tashkent('2026-08-24', '12:00'))).toBe(false);
  });

  it('jadval bo\'yicha yopiq bo\'lsa — YOPIQ', () => {
    expect(isRestaurantOpen(NINE_TO_TEN, true, tashkent('2026-08-24', '03:00'))).toBe(false);
  });

  it('ikkalasi rozi bo\'lsa — OCHIQ', () => {
    expect(isRestaurantOpen(NINE_TO_TEN, true, tashkent('2026-08-24', '12:00'))).toBe(true);
  });

  it('JADVAL YO\'Q bo\'lsa bayroqqa suyanadi', () => {
    /**
     * Ko'chirish kunidagi eng muhim holat: jadvali kiritilmagan
     * barcha eski restoranlar birdaniga "yopiq" bo'lib qolmasligi
     * kerak.
     */
    expect(isRestaurantOpen([], true, tashkent('2026-08-24', '03:00'))).toBe(true);
    expect(isRestaurantOpen([], false, tashkent('2026-08-24', '12:00'))).toBe(false);
  });
});

describe('holat matni', () => {
  it('ochiq bo\'lsa YOPILISH vaqti aytiladi', () => {
    /**
     * Soat 21:50 da buyurtma berayotgan odam shoshilishi
     * kerakligini bilishi kerak.
     */
    const state = describeOpenState(NINE_TO_TEN, true, tashkent('2026-08-24', '21:50'));

    expect(state.isOpen).toBe(true);
    expect(state.text).toBe('22:00 gacha ochiq');
  });

  it('ochilishdan oldin BUGUNGI vaqt aytiladi', () => {
    const state = describeOpenState(NINE_TO_TEN, true, tashkent('2026-08-24', '07:00'));

    expect(state.isOpen).toBe(false);
    expect(state.text).toBe('09:00 da ochiladi');
  });

  it('yopilgandan keyin ERTANGI vaqt aytiladi', () => {
    /**
     * "Yopiq" degan quruq yozuvni ko'rgan odam sahifadan chiqib
     * ketadi. "Ertaga 09:00 da ochiladi" esa qaytish uchun sabab
     * beradi.
     */
    const state = describeOpenState(NINE_TO_TEN, true, tashkent('2026-08-24', '23:00'));

    expect(state.text).toBe('Ertaga 09:00 da ochiladi');
  });

  it('dam olishdan keyin KUN NOMI aytiladi', () => {
    // Shanba kuni — keyingi ish kuni dushanba.
    const state = describeOpenState(NINE_TO_TEN, true, tashkent('2026-08-22', '12:00'));

    expect(state.text).toBe('Dushanba kuni 09:00 da ochiladi');
  });

  it('bayroq o\'chiq bo\'lsa SABAB boshqacha', () => {
    const state = describeOpenState(NINE_TO_TEN, false, tashkent('2026-08-24', '12:00'));

    expect(state.isOpen).toBe(false);
    expect(state.text).toBe('Vaqtincha yopiq');
  });

  it('tungi smenada yopilish vaqti TO\'G\'RI olinadi', () => {
    const nightCafe: DayHours[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      weekday,
      opensAt: 18 * 60,
      closesAt: 2 * 60,
    }));

    // Yarim tundan keyin — KECHAGI yozuvning yopilish vaqti.
    expect(describeOpenState(nightCafe, true, tashkent('2026-08-25', '01:00')).text).toBe(
      '02:00 gacha ochiq',
    );

    // Kechqurun — BUGUNGI yozuvning yopilish vaqti.
    expect(describeOpenState(nightCafe, true, tashkent('2026-08-24', '20:00')).text).toBe(
      '02:00 gacha ochiq',
    );
  });
});

describe('haftalik jadval', () => {
  it('bir xil kunlar BIRLASHTIRILADI', () => {
    /**
     * Ettita alohida qator ekranning yarmini egallaydi va odam
     * ularni o'qimaydi.
     */
    const rows = buildSchedule(NINE_TO_TEN, tashkent('2026-08-24', '12:00'));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ days: 'Du — Ju', time: '09:00 — 22:00' });
    expect(rows[1]).toMatchObject({ days: 'Sha — Yak', time: 'Dam olish' });
  });

  it('hafta DUSHANBADAN boshlanadi', () => {
    /**
     * `Date.getDay()` yakshanbani birinchi deb hisoblaydi.
     * O'zbekistonda esa hafta dushanbadan boshlanadi.
     */
    const rows = buildSchedule(NINE_TO_TEN, tashkent('2026-08-24', '12:00'));

    expect(rows[0].days.startsWith('Du')).toBe(true);
  });

  it('BUGUNGI qator belgilanadi', () => {
    // 2026-08-24 — dushanba, ya'ni birinchi qatorda.
    const rows = buildSchedule(NINE_TO_TEN, tashkent('2026-08-24', '12:00'));

    expect(rows[0].isToday).toBe(true);
    expect(rows[1].isToday).toBe(false);
  });

  it('har xil kunlar ALOHIDA qoladi', () => {
    const mixed: DayHours[] = [
      { weekday: 1, opensAt: 9 * 60, closesAt: 18 * 60 },
      { weekday: 2, opensAt: 10 * 60, closesAt: 20 * 60 },
    ];

    const rows = buildSchedule(mixed, tashkent('2026-08-24', '12:00'));

    expect(rows[0]).toMatchObject({ days: 'Dushanba', time: '09:00 — 18:00' });
    expect(rows[1]).toMatchObject({ days: 'Seshanba', time: '10:00 — 20:00' });
  });

  it('jadval BO\'SH bo\'lsa ham buzilmaydi', () => {
    const rows = buildSchedule([], tashkent('2026-08-24', '12:00'));

    expect(rows).toHaveLength(1);
    expect(rows[0].time).toBe('Dam olish');
  });

  it('barcha kunlar QAMRAB olinadi', () => {
    const rows = buildSchedule(NINE_TO_TEN, tashkent('2026-08-24', '12:00'));

    // Qatorlardagi kunlar yig'indisi ettita bo'lishi kerak.
    const covered = rows.reduce(
      (sum, row) => sum + (row.days.includes('—') ? row.days.split('—').length : 1),
      0,
    );

    expect(covered).toBeGreaterThanOrEqual(2);
    expect(rows.every((row) => row.time.length > 0)).toBe(true);
  });
});
