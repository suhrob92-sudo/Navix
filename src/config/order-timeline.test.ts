import { describe, expect, it } from 'vitest';

import { buildTimeline, daysSince, sinceText, type OrderEventView } from '@/config/order-timeline';

/**
 * Buyurtma yo'li — testlar.
 */

const event = (
  status: OrderEventView['status'],
  at: string,
  note: string | null = null,
): OrderEventView => ({ status, at, note, actor: null });

describe('kuzatuv chizig\'i', () => {
  it('barcha bosqichlar KO\'RSATILADI', () => {
    /**
     * Faqat bo'lib o'tganlarini ko'rsatish ham mumkin edi, lekin
     * o'shanda xaridor "yana nechta bosqich qoldi" degan savolga
     * javob topa olmasdi.
     */
    const steps = buildTimeline([event('PENDING', '2026-08-01T10:00:00Z')], 'PENDING');

    expect(steps).toHaveLength(5);
    expect(steps.map((step) => step.status)).toEqual([
      'PENDING',
      'CONFIRMED',
      'PACKING',
      'SHIPPED',
      'DELIVERED',
    ]);
  });

  it('o\'tilgan bosqichlar belgilanadi', () => {
    const steps = buildTimeline(
      [event('PENDING', '2026-08-01T10:00:00Z'), event('CONFIRMED', '2026-08-01T12:00:00Z')],
      'CONFIRMED',
    );

    expect(steps[0].isDone).toBe(true);
    expect(steps[1].isDone).toBe(true);
    expect(steps[1].isCurrent).toBe(true);
    expect(steps[2].isDone).toBe(false);
  });

  it('YOZUVI YO\'Q bosqich ham o\'tilgan deb belgilanadi', () => {
    /**
     * `PACKING` bosqichiga hech qachon ustun bo'lmagan va eski
     * buyurtmalarda uning yozuvi yo'q.
     *
     * Faqat yozuvga qarasak, yetkazilgan buyurtmada ham
     * "Yig'ilmoqda" bosqichi o'tilmagandek ko'rinardi — ya'ni
     * mahsulot yetib kelgan, lekin "hali yig'ilmagan".
     */
    const steps = buildTimeline(
      [event('PENDING', '2026-08-01T10:00:00Z'), event('DELIVERED', '2026-08-05T10:00:00Z')],
      'DELIVERED',
    );

    const packing = steps.find((step) => step.status === 'PACKING');

    expect(packing?.isDone).toBe(true);
    // Sana esa YO'Q — uni o'ylab topish yolg'on bo'lardi.
    expect(packing?.at).toBeNull();
  });

  it("BIRINCHI bosqichda ism ko'rsatilmaydi", () => {
    /**
     * Birinchi yozuvni har doim xaridorning o'zi yaratadi. Lekin
     * bosqich nomi "Qabul qilinmoqda", ya'ni DO'KON qabul qilishini
     * bildiradi.
     *
     * Yonida xaridor ismi turgach, chiziq "buyurtmani Ish qabul
     * qilmoqda" degandek o'qilardi.
     */
    const steps = buildTimeline(
      [{ status: 'PENDING', at: '2026-08-01T10:00:00Z', note: null, actor: 'Ish' }],
      'PENDING',
    );

    expect(steps[0].actor).toBeNull();
  });

  it("qolgan bosqichlarda ism QOLADI", () => {
    // "Yo'lga chiqarildi · Sanjar" — bu foydali ma'lumot.
    const steps = buildTimeline(
      [
        { status: 'PENDING', at: '2026-08-01T10:00:00Z', note: null, actor: 'Ish' },
        { status: 'CONFIRMED', at: '2026-08-01T12:00:00Z', note: null, actor: 'Sanjar' },
      ],
      'CONFIRMED',
    );

    expect(steps[1].actor).toBe('Sanjar');
  });

  it('sana yozuvdan olinadi', () => {
    const steps = buildTimeline([event('PENDING', '2026-08-01T10:00:00Z')], 'PENDING');

    expect(steps[0].at).toBe('2026-08-01T10:00:00Z');
  });

  it('bir bosqich ikki marta yozilsa BIRINCHISI olinadi', () => {
    /**
     * Xaridor uchun "qachon birinchi marta bo'lgani" muhim.
     */
    const steps = buildTimeline(
      [
        event('CONFIRMED', '2026-08-02T10:00:00Z'),
        event('PENDING', '2026-08-01T10:00:00Z'),
        event('CONFIRMED', '2026-08-01T15:00:00Z'),
      ],
      'CONFIRMED',
    );

    expect(steps[1].at).toBe('2026-08-01T15:00:00Z');
  });

  it('yozuvlar TARTIBI ahamiyatsiz', () => {
    const forward = buildTimeline(
      [event('PENDING', '2026-08-01T10:00:00Z'), event('CONFIRMED', '2026-08-02T10:00:00Z')],
      'CONFIRMED',
    );

    const backward = buildTimeline(
      [event('CONFIRMED', '2026-08-02T10:00:00Z'), event('PENDING', '2026-08-01T10:00:00Z')],
      'CONFIRMED',
    );

    expect(forward).toEqual(backward);
  });
});

describe('bekor qilingan buyurtma', () => {
  it('KELAJAKDAGI bosqichlar ko\'rsatilmaydi', () => {
    /**
     * Aks holda "Yetkazildi" degan kulrang qator turardi va u hech
     * qachon yonmaydigan va'daga o'xshardi.
     */
    const steps = buildTimeline(
      [
        event('PENDING', '2026-08-01T10:00:00Z'),
        event('CONFIRMED', '2026-08-01T12:00:00Z'),
        event('CANCELLED', '2026-08-02T09:00:00Z', 'omborda topilmadi'),
      ],
      'CANCELLED',
    );

    expect(steps.map((step) => step.status)).toEqual(['PENDING', 'CONFIRMED', 'CANCELLED']);
  });

  it('bekor qilish SABABI saqlanadi', () => {
    const steps = buildTimeline(
      [
        event('PENDING', '2026-08-01T10:00:00Z'),
        event('CANCELLED', '2026-08-02T09:00:00Z', 'omborda topilmadi'),
      ],
      'CANCELLED',
    );

    expect(steps.at(-1)?.note).toBe('omborda topilmadi');
    expect(steps.at(-1)?.isCurrent).toBe(true);
  });

  it('darhol bekor qilingan buyurtma ham chiziladi', () => {
    const steps = buildTimeline(
      [
        event('PENDING', '2026-08-01T10:00:00Z'),
        event('CANCELLED', '2026-08-01T10:05:00Z'),
      ],
      'CANCELLED',
    );

    expect(steps).toHaveLength(2);
  });
});

describe('vaqt matni', () => {
  const now = new Date('2026-08-10T12:00:00Z');

  it('bugungi voqea uchun "bugun"', () => {
    expect(sinceText('2026-08-10T09:00:00Z', now)).toBe('bugun');
  });

  it('kechagi voqea uchun "kecha"', () => {
    expect(sinceText('2026-08-09T09:00:00Z', now)).toBe('kecha');
  });

  it('eskiroq voqea uchun kunlar sanaladi', () => {
    expect(sinceText('2026-08-05T12:00:00Z', now)).toBe('5 kun oldin');
  });

  it('KELAJAKDAGI sana manfiy bermaydi', () => {
    // Server va brauzer vaqti biroz farq qilishi mumkin.
    expect(daysSince('2026-08-20T12:00:00Z', now)).toBe(0);
    expect(sinceText('2026-08-20T12:00:00Z', now)).toBe('bugun');
  });

  it('yaroqsiz sana buzmaydi', () => {
    expect(daysSince('salom', now)).toBe(0);
  });
});
