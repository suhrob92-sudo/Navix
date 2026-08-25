import { describe, expect, it } from 'vitest';

import {
  buildApplicationTimeline,
  waitingDays,
  waitingText,
  type ApplicationTimes,
} from '@/config/application-timeline';

/**
 * Ariza kuzatuvi — testlar.
 */

const BASE: ApplicationTimes = {
  status: 'VIEWED',
  createdAt: '2026-08-10T09:00:00Z',
  viewedAt: '2026-08-12T14:00:00Z',
  decidedAt: null,
};

describe('chiziq', () => {
  it('odatdagi yo\'l uchta bosqich', () => {
    const steps = buildApplicationTimeline(BASE);

    expect(steps.map((step) => step.status)).toEqual(['SENT', 'VIEWED', 'INVITED']);
  });

  it("o'tilgan bosqichlar belgilanadi", () => {
    const steps = buildApplicationTimeline(BASE);

    expect(steps.filter((step) => step.isDone).map((step) => step.status)).toEqual(['SENT', 'VIEWED']);
  });

  it('HOZIRGI bosqich bittagina', () => {
    const steps = buildApplicationTimeline(BASE);

    expect(steps.filter((step) => step.isCurrent).map((step) => step.status)).toEqual(['VIEWED']);
  });

  it('vaqtlar o\'z bosqichiga tushadi', () => {
    const steps = buildApplicationTimeline(BASE);

    expect(steps.find((step) => step.status === 'SENT')?.at).toBe('2026-08-10T09:00:00Z');
    expect(steps.find((step) => step.status === 'VIEWED')?.at).toBe('2026-08-12T14:00:00Z');
  });

  it("ko'rilmagan ariza — birinchi bosqichda", () => {
    const steps = buildApplicationTimeline({ ...BASE, status: 'SENT', viewedAt: null });

    expect(steps.find((step) => step.status === 'VIEWED')?.isDone).toBe(false);
    expect(steps.find((step) => step.status === 'VIEWED')?.at).toBeNull();
  });

  it("ko'rilmasdan TAKLIF qilinsa ham bosqich o'tilgan", () => {
    /**
     * Ish beruvchi arizani ochmasdan turib taklif qilishi mumkin
     * (masalan nomzodni allaqachon biladi). O'shanda `viewedAt`
     * bo'sh, lekin bosqich o'tilgan.
     */
    const steps = buildApplicationTimeline({
      status: 'INVITED',
      createdAt: '2026-08-10T09:00:00Z',
      viewedAt: null,
      decidedAt: '2026-08-13T10:00:00Z',
    });

    expect(steps.find((step) => step.status === 'VIEWED')?.isDone).toBe(true);
    expect(steps.find((step) => step.status === 'INVITED')?.isCurrent).toBe(true);
  });
});

describe('rad etilgan ariza', () => {
  const rejected: ApplicationTimes = {
    status: 'REJECTED',
    createdAt: '2026-08-10T09:00:00Z',
    viewedAt: '2026-08-12T14:00:00Z',
    decidedAt: '2026-08-14T11:00:00Z',
  };

  it('"Taklif qilindi" bosqichi KO\'RSATILMAYDI', () => {
    /**
     * Kulrang "Taklif qilindi" qatori "hali bo'lishi mumkin" degan
     * yolg'on umid berardi.
     */
    const steps = buildApplicationTimeline(rejected);

    expect(steps.some((step) => step.status === 'INVITED')).toBe(false);
  });

  it('bosib o\'tilgan bosqichlar QOLADI', () => {
    const steps = buildApplicationTimeline(rejected);

    expect(steps.map((step) => step.status)).toEqual(['SENT', 'VIEWED', 'REJECTED']);
  });

  it('oxirgi qator — rad etish', () => {
    const steps = buildApplicationTimeline(rejected);

    expect(steps[steps.length - 1].isCurrent).toBe(true);
    expect(steps[steps.length - 1].at).toBe('2026-08-14T11:00:00Z');
  });
});

describe('qaytarib olingan ariza', () => {
  it("o'z qatori bilan tugaydi", () => {
    const steps = buildApplicationTimeline({
      status: 'WITHDRAWN',
      createdAt: '2026-08-10T09:00:00Z',
      viewedAt: null,
      decidedAt: '2026-08-11T09:00:00Z',
    });

    expect(steps.map((step) => step.status)).toEqual(['SENT', 'WITHDRAWN']);
  });
});

describe('kutish muddati', () => {
  const now = new Date('2026-08-22T09:00:00Z');

  it("ko'rilgan arizada KO'RILGAN kundan sanaladi", () => {
    /**
     * Aks holda "20 kundan beri javob yo'q" degan yozuv ish
     * beruvchi kecha ko'rgan arizada ham turardi.
     */
    expect(waitingDays(BASE, now)).toBe(9);
  });

  it("ko'rilmagan arizada YUBORILGAN kundan", () => {
    expect(waitingDays({ ...BASE, status: 'SENT', viewedAt: null }, now)).toBe(12);
  });

  it('javob kelgan arizada kutish YO\'Q', () => {
    expect(waitingDays({ ...BASE, status: 'INVITED', decidedAt: '2026-08-20T09:00:00Z' }, now)).toBeNull();
    expect(waitingDays({ ...BASE, status: 'REJECTED' }, now)).toBeNull();
  });

  it('qaytarib olingan arizada ham yo\'q', () => {
    expect(waitingDays({ ...BASE, status: 'WITHDRAWN' }, now)).toBeNull();
  });

  it('yaroqsiz sana null beradi', () => {
    expect(waitingDays({ ...BASE, viewedAt: 'salom' }, now)).toBeNull();
  });

  it('MANFIY son chiqmaydi', () => {
    expect(waitingDays({ ...BASE, viewedAt: '2026-09-01T09:00:00Z' }, now)).toBe(0);
  });
});

describe('kutish matni', () => {
  const now = new Date('2026-08-22T09:00:00Z');

  it("ko'rilgan arizada boshqacha yoziladi", () => {
    expect(waitingText(BASE, now)).toBe("Ko'rilganiga 9 kun bo'ldi");
  });

  it("ko'rilmaganda — yuborilganidan", () => {
    expect(waitingText({ ...BASE, status: 'SENT', viewedAt: null }, now)).toBe('Yuborilganiga 12 kun bo\'ldi');
  });

  it('bitta kun uchun ham to\'g\'ri', () => {
    expect(waitingText({ ...BASE, viewedAt: '2026-08-21T09:00:00Z' }, now)).toBe("Ko'rilganiga 1 kun bo'ldi");
  });

  it('BUGUNGI arizada matn YO\'Q', () => {
    // "0 kundan beri javob yo'q" arizani endi yuborgan odamni xavotirga solardi.
    expect(waitingText({ ...BASE, viewedAt: '2026-08-22T08:00:00Z' }, now)).toBeNull();
  });

  it('javob kelgan arizada matn yo\'q', () => {
    expect(waitingText({ ...BASE, status: 'INVITED' }, now)).toBeNull();
  });
});
