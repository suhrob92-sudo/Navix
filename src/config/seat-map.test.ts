import { describe, expect, it } from 'vitest';

import {
  SEAT_LAYOUTS,
  allSeatNumbers,
  buildSeatMap,
  sortSeats,
  toggleSeat,
  unknownTakenSeats,
} from '@/config/seat-map';

/**
 * O'rindiq xaritasi — testlar.
 *
 * Bu yerdagi xato odamni mavjud bo'lmagan o'rinni tanlashga
 * undardi — u buni avtobusga chiqqanda bilardi.
 */

describe('samolyot xaritasi', () => {
  it('qatorda oltita o\'rin', () => {
    const rows = buildSeatMap('PLANE', 12);

    expect(rows).toHaveLength(2);
    expect(rows[0].seats).toHaveLength(6);
  });

  it('o\'rinlar HARF bilan', () => {
    // "12A" — butun dunyoda shunday.
    const rows = buildSeatMap('PLANE', 6);

    expect(rows[0].seats.map((seat) => seat.number)).toEqual(['1A', '1B', '1C', '1D', '1E', '1F']);
  });

  it('ikkinchi qator ikkidan boshlanadi', () => {
    const rows = buildSeatMap('PLANE', 12);

    expect(rows[1].seats[0].number).toBe('2A');
  });

  it('YO\'LAK uchinchi o\'rindan keyin', () => {
    const rows = buildSeatMap('PLANE', 6);

    expect(rows[0].seats.map((seat) => seat.aisleAfter)).toEqual([false, false, true, false, false, false]);
  });
});

describe('avtobus xaritasi', () => {
  it('qatorda to\'rtta o\'rin', () => {
    expect(buildSeatMap('BUS', 8)[0].seats).toHaveLength(4);
  });

  it('o\'rinlar RAQAM bilan', () => {
    // O'zbekistonda avtobus chiptasida "24-o'rin" yoziladi.
    const rows = buildSeatMap('BUS', 8);

    expect(rows[0].seats.map((seat) => seat.number)).toEqual(['1', '2', '3', '4']);
    expect(rows[1].seats.map((seat) => seat.number)).toEqual(['5', '6', '7', '8']);
  });

  it('yo\'lak ikkinchi o\'rindan keyin', () => {
    expect(buildSeatMap('BUS', 4)[0].seats[1].aisleAfter).toBe(true);
  });
});

describe('poyezd xaritasi', () => {
  it('avtobus bilan bir xil joylashuv', () => {
    // Sabab `seat-map.ts` izohida: haqiqiy vagon sxemasi bizda YO'Q.
    expect(SEAT_LAYOUTS.TRAIN).toEqual(SEAT_LAYOUTS.BUS);
  });
});

describe('to\'liq bo\'lmagan qator', () => {
  it('oxirgi qatorda kam o\'rin bo\'lishi mumkin', () => {
    /**
     * 50 o'rinli avtobus, qatorda 4 tadan — oxirgi qatorda 2 ta.
     * To'ldirib qo'yish mavjud bo'lmagan o'rinni ko'rsatardi.
     */
    const rows = buildSeatMap('BUS', 50);

    expect(rows).toHaveLength(13);
    expect(rows[12].seats).toHaveLength(2);
  });

  it('jami o\'rinlar soni SAQLANADI', () => {
    for (const total of [1, 7, 33, 50, 180]) {
      expect(allSeatNumbers(buildSeatMap('BUS', total))).toHaveLength(total);
    }
  });

  it('o\'rin raqamlari TAKRORLANMAYDI', () => {
    const numbers = allSeatNumbers(buildSeatMap('PLANE', 180));

    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('yolg\'on qiymatda bo\'sh xarita', () => {
    expect(buildSeatMap('BUS', 0)).toEqual([]);
    expect(buildSeatMap('BUS', -5)).toEqual([]);
    expect(buildSeatMap('BUS', 1.5)).toEqual([]);
  });

  it('bitta o\'rinda yo\'lak chizilmaydi', () => {
    // Yo'lak qator chetida bo'lardi va bo'sh joyni bekorga egallardi.
    expect(buildSeatMap('BUS', 1)[0].seats[0].aisleAfter).toBe(false);
  });
});

describe('tanlash', () => {
  it('qo\'shiladi', () => {
    expect(toggleSeat([], '1A', 3)).toEqual(['1A']);
  });

  it('takroriy bosish OLIB TASHLAYDI', () => {
    expect(toggleSeat(['1A', '1B'], '1A', 3)).toEqual(['1B']);
  });

  it('chegaradan OSHMAYDI', () => {
    expect(toggleSeat(['1A', '1B'], '1C', 2)).toEqual(['1A', '1B']);
  });

  it('chegarada ham OLIB TASHLASH ishlaydi', () => {
    // Aks holda odam tanlovini o'zgartira olmasdi.
    expect(toggleSeat(['1A', '1B'], '1A', 2)).toEqual(['1B']);
  });
});

describe('tartiblash', () => {
  it('xaritadagi tartibda beradi', () => {
    const rows = buildSeatMap('PLANE', 12);

    expect(sortSeats(['1C', '1A', '1B'], rows)).toEqual(['1A', '1B', '1C']);
  });

  it('MATN tartibi emas, xarita tartibi', () => {
    /**
     * "10" bilan "9" ni matn sifatida solishtirsak, "10" oldinga
     * chiqib ketardi.
     */
    const rows = buildSeatMap('BUS', 12);

    expect(sortSeats(['10', '9'], rows)).toEqual(['9', '10']);
  });

  it('noma\'lum o\'rin oxiriga tushadi', () => {
    const rows = buildSeatMap('BUS', 4);

    expect(sortSeats(['99', '2'], rows)).toEqual(['2', '99']);
  });
});

describe('noma\'lum band o\'rinlar', () => {
  it('eski chiptalar hisobga olinadi', () => {
    /**
     * O'rin tanlash 51-bosqichda qo'shildi. Undan oldingi
     * chiptalarda qaysi o'rin ekani saqlanmagan.
     */
    expect(unknownTakenSeats(10, 4)).toBe(6);
  });

  it('hammasi ma\'lum bo\'lsa nol', () => {
    expect(unknownTakenSeats(4, 4)).toBe(0);
  });

  it('MANFIY son chiqmaydi', () => {
    // Ma'lumot buzilgan bo'lsa ham ekranda g'alati son turmasin.
    expect(unknownTakenSeats(2, 5)).toBe(0);
  });
});
