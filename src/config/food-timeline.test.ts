import { describe, expect, it } from 'vitest';

import { buildFoodTimeline, minutesInStep, stepDurationText, type FoodOrderTimes } from '@/config/food-timeline';

/**
 * Ovqat buyurtmasi chizig'i — testlar.
 */

const BASE: FoodOrderTimes = {
  status: 'PREPARING',
  createdAt: '2026-08-25T12:00:00Z',
  confirmedAt: '2026-08-25T12:02:00Z',
  preparingAt: '2026-08-25T12:05:00Z',
  deliveringAt: null,
  deliveredAt: null,
  cancelledAt: null,
};

describe('chiziq', () => {
  it('barcha bosqichlar ko\'rinadi', () => {
    const steps = buildFoodTimeline(BASE);

    expect(steps.map((step) => step.status)).toEqual([
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'DELIVERING',
      'DELIVERED',
    ]);
  });

  it('o\'tilgan bosqichlar belgilanadi', () => {
    const steps = buildFoodTimeline(BASE);

    expect(steps.filter((step) => step.isDone).map((step) => step.status)).toEqual([
      'PENDING',
      'CONFIRMED',
      'PREPARING',
    ]);
  });

  it('HOZIRGI bosqich bittagina', () => {
    const steps = buildFoodTimeline(BASE);

    expect(steps.filter((step) => step.isCurrent).map((step) => step.status)).toEqual(['PREPARING']);
  });

  it('vaqtlar o\'z bosqichiga tushadi', () => {
    const steps = buildFoodTimeline(BASE);

    expect(steps.find((step) => step.status === 'CONFIRMED')?.at).toBe('2026-08-25T12:02:00Z');
    expect(steps.find((step) => step.status === 'PREPARING')?.at).toBe('2026-08-25T12:05:00Z');
  });

  it('kelajakdagi bosqichda vaqt YO\'Q', () => {
    const steps = buildFoodTimeline(BASE);

    expect(steps.find((step) => step.status === 'DELIVERED')?.at).toBeNull();
  });

  it('ESKI buyurtmada vaqt O\'YLAB TOPILMAYDI', () => {
    /**
     * `preparingAt` ustuni 48-bosqichda qo'shilgan. Undan oldingi
     * yetkazilgan buyurtmalarda u bo'sh va uni to'ldirishning halol
     * yo'li yo'q.
     *
     * Bosqich o'tilgan deb ko'rsatiladi (chunki buyurtma yetkazilgan),
     * vaqti esa bo'sh qoladi.
     */
    const old: FoodOrderTimes = {
      status: 'DELIVERED',
      createdAt: '2026-07-01T12:00:00Z',
      confirmedAt: '2026-07-01T12:03:00Z',
      preparingAt: null,
      deliveringAt: null,
      deliveredAt: '2026-07-01T12:44:00Z',
      cancelledAt: null,
    };

    const steps = buildFoodTimeline(old);
    const preparing = steps.find((step) => step.status === 'PREPARING');

    expect(preparing?.isDone).toBe(true);
    expect(preparing?.at).toBeNull();
  });

  it('nomlar odam tilida', () => {
    const steps = buildFoodTimeline(BASE);

    expect(steps.find((step) => step.status === 'DELIVERING')?.label).toBe("Yo'lda");
  });
});

describe('bekor qilingan buyurtma', () => {
  const cancelled: FoodOrderTimes = {
    status: 'CANCELLED',
    createdAt: '2026-08-25T12:00:00Z',
    confirmedAt: '2026-08-25T12:02:00Z',
    preparingAt: null,
    deliveringAt: null,
    deliveredAt: null,
    cancelledAt: '2026-08-25T12:06:00Z',
  };

  it('kelajakdagi bosqichlar KO\'RSATILMAYDI', () => {
    /**
     * "Yetkazildi" degan kulrang qator hech qachon yonmaydigan
     * va'daga o'xshardi.
     */
    const steps = buildFoodTimeline(cancelled);

    expect(steps.some((step) => step.status === 'DELIVERED')).toBe(false);
    expect(steps.some((step) => step.status === 'DELIVERING')).toBe(false);
  });

  it('bosib o\'tilgan bosqichlar QOLADI', () => {
    const steps = buildFoodTimeline(cancelled);

    expect(steps.map((step) => step.status)).toEqual(['PENDING', 'CONFIRMED', 'CANCELLED']);
  });

  it('oxirgi qator — bekor qilish', () => {
    const steps = buildFoodTimeline(cancelled);
    const last = steps[steps.length - 1];

    expect(last.isCurrent).toBe(true);
    expect(last.at).toBe('2026-08-25T12:06:00Z');
  });
});

describe('bosqichda o\'tgan vaqt', () => {
  const now = new Date('2026-08-25T12:17:00Z');

  it('hozirgi bosqichdan hisoblanadi', () => {
    // 12:05 da boshlangan -> 12 daqiqa.
    expect(minutesInStep(buildFoodTimeline(BASE), now)).toBe(12);
  });

  it('vaqt noma\'lum bo\'lsa null', () => {
    const steps = buildFoodTimeline({ ...BASE, preparingAt: null });

    expect(minutesInStep(steps, now)).toBeNull();
  });

  it('MANFIY son chiqmaydi', () => {
    // Server va telefon vaqti farq qilsa bosqich "kelajakda" bo'lib qolishi mumkin.
    const steps = buildFoodTimeline({ ...BASE, preparingAt: '2026-08-25T12:30:00Z' });

    expect(minutesInStep(steps, now)).toBe(0);
  });

  it('yaroqsiz sana null beradi', () => {
    const steps = buildFoodTimeline({ ...BASE, preparingAt: 'salom' });

    expect(minutesInStep(steps, now)).toBeNull();
  });
});

describe('vaqt matni', () => {
  it('daqiqada', () => {
    expect(stepDurationText(12)).toBe('12 daqiqadan beri');
  });

  it('bir daqiqadan kam vaqt KO\'RSATILMAYDI', () => {
    // "0 daqiqadan beri" degan yozuv g'alati.
    expect(stepDurationText(0)).toBeNull();
    expect(stepDurationText(null)).toBeNull();
  });

  it('roppa-rosa soat', () => {
    expect(stepDurationText(120)).toBe('2 soatdan beri');
  });

  it('soat va daqiqa birga', () => {
    expect(stepDurationText(75)).toBe('1 soat 15 daqiqadan beri');
  });
});
