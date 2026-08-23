import { describe, expect, it } from 'vitest';

import {
  cutoffNotice,
  deliveryPromise,
  estimateDeliveryDateKey,
  formatDeliveryDate,
  ORDER_CUTOFF_HOUR,
} from '@/config/delivery-date';

/**
 * Yetkazish sanasi — testlar.
 *
 * ── Nima uchun vaqt QO'LDA beriladi ───────────────────────────────────
 * "Hozir" ni belgilamasak, sinov natijasi u ishga tushgan soatga
 * bog'liq bo'lardi va tunda buzilardi.
 *
 * Barcha vaqtlar UTC da yozilgan; Toshkent undan 5 soat oldinda.
 */

/** Toshkent bo'yicha 10:00 — kesimdan oldin. */
const MORNING = new Date('2026-08-03T05:00:00Z');
/** Toshkent bo'yicha 20:00 — kesimdan keyin. */
const EVENING = new Date('2026-08-03T15:00:00Z');

describe('sana hisobi', () => {
  it("kesimdan OLDIN shu kundan hisoblanadi", () => {
    expect(estimateDeliveryDateKey(2, MORNING)).toBe('2026-08-05');
  });

  it('kesimdan KEYIN bir kunga suriladi', () => {
    /**
     * Eng muhim tekshiruv: kechqurun berilgan buyurtma o'sha kuni
     * yig'ilmaydi. Kesimsiz hisob yolg'on va'da berardi.
     */
    expect(estimateDeliveryDateKey(2, EVENING)).toBe('2026-08-06');
  });

  it("kesim soatining O'ZI kech hisoblanadi", () => {
    // Toshkent bo'yicha rosa 18:00.
    const atCutoff = new Date('2026-08-03T13:00:00Z');

    expect(estimateDeliveryDateKey(1, atCutoff)).toBe('2026-08-05');
  });

  it('nol kun — bugun yetkaziladi', () => {
    expect(estimateDeliveryDateKey(0, MORNING)).toBe('2026-08-03');
  });

  it('MANFIY kun nolga tenglanadi', () => {
    // Bazadagi buzilgan qiymat sanani orqaga surib yubormasligi kerak.
    expect(estimateDeliveryDateKey(-5, MORNING)).toBe('2026-08-03');
  });

  it('kasr kun butunga keltiriladi', () => {
    expect(estimateDeliveryDateKey(2.9, MORNING)).toBe('2026-08-05');
  });

  it('OY chegarasidan o\'tadi', () => {
    // 30-avgust + 3 kun = 2-sentabr.
    const endOfMonth = new Date('2026-08-30T05:00:00Z');

    expect(estimateDeliveryDateKey(3, endOfMonth)).toBe('2026-09-02');
  });

  it('YIL chegarasidan o\'tadi', () => {
    const endOfYear = new Date('2026-12-30T05:00:00Z');

    expect(estimateDeliveryDateKey(3, endOfYear)).toBe('2027-01-02');
  });

  it("YARIM TUNDAN keyin Toshkent kuni to'g'ri olinadi", () => {
    /**
     * UTC bo'yicha hali 2-avgust, Toshkentda esa allaqachon
     * 3-avgust (soat 01:00). Sana Toshkent bo'yicha olinishi kerak.
     */
    const afterMidnight = new Date('2026-08-02T20:00:00Z');

    expect(estimateDeliveryDateKey(1, afterMidnight)).toBe('2026-08-04');
  });
});

describe('sana matni', () => {
  it("bugun, ertaga va indinga SO'Z bilan aytiladi", () => {
    /**
     * "3-avgust" o'zi hech narsa aytmaydi: odam bugun nechanchi
     * sana ekanini har doim ham bilmaydi.
     */
    expect(formatDeliveryDate('2026-08-03', MORNING)).toBe('bugun');
    expect(formatDeliveryDate('2026-08-04', MORNING)).toBe('ertaga');
    expect(formatDeliveryDate('2026-08-05', MORNING)).toBe('indinga');
  });

  it('uzoqroq sanada HAFTA KUNI ham yoziladi', () => {
    // 2026-08-06 — payshanba.
    expect(formatDeliveryDate('2026-08-06', MORNING)).toBe('6-avgust, payshanba');
  });

  it('oy nomi o\'zbekcha', () => {
    expect(formatDeliveryDate('2026-01-15', MORNING)).toContain('yanvar');
    expect(formatDeliveryDate('2026-12-15', MORNING)).toContain('dekabr');
  });

  it("har bir hafta kuni NOMLANGAN", () => {
    /**
     * Kalit yetishmasa, matnda `undefined` chiqib qolardi va uni
     * faqat o'sha kuni ko'rish mumkin bo'lardi.
     */
    for (let offset = 0; offset < 7; offset += 1) {
      const key = `2026-08-${String(10 + offset).padStart(2, '0')}`;
      const text = formatDeliveryDate(key, MORNING);

      expect(text).not.toContain('undefined');
    }
  });
});

describe("to'liq jumla", () => {
  it("sana bilan birga yoziladi", () => {
    expect(deliveryPromise(1, MORNING)).toBe('Yetkazish — ertaga');
  });

  it('kesimdan keyin BOSHQACHA javob beradi', () => {
    expect(deliveryPromise(1, MORNING)).not.toBe(deliveryPromise(1, EVENING));
  });
});

describe('kesim ogohlantirishi', () => {
  it('kesimdan oldin KO\'RSATILADI', () => {
    const notice = cutoffNotice(MORNING);

    expect(notice).not.toBeNull();
    expect(notice).toContain(String(ORDER_CUTOFF_HOUR));
  });

  it("kesimdan keyin ko'rsatilmaydi", () => {
    // Vaqt o'tgan — shoshiltirishning ma'nosi yo'q.
    expect(cutoffNotice(EVENING)).toBeNull();
  });
});
