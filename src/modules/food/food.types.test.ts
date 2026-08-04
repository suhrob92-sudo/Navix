import { describe, expect, it } from 'vitest';

import {
  FOOD_ORDER_ACTION_LABELS,
  FOOD_ORDER_FLOW,
  FOOD_ORDER_STATUS_LABELS,
  FOOD_ORDER_STATUS_VARIANTS,
  FOOD_ORDER_TRANSITIONS,
  canRestaurantReject,
  canTransition,
  isCancellable,
  isFinalStatus,
  nextStatus,
  type FoodOrderStatusName,
} from '@/modules/food/food.types';

const ALL_STATUSES = Object.keys(FOOD_ORDER_STATUS_LABELS) as FoodOrderStatusName[];

describe('buyurtma holatlari', () => {
  it("har bir holatning o'zbekcha nomi va rangi bor", () => {
    for (const status of ALL_STATUSES) {
      expect(FOOD_ORDER_STATUS_LABELS[status].length).toBeGreaterThan(0);
      expect(FOOD_ORDER_STATUS_VARIANTS[status]).toBeDefined();
    }
  });

  it("kuzatuv chizig'ida bekor qilish YO'Q", () => {
    // Bekor qilish — yon tarmoq, bosqich emas. Uni chiziqqa qo'shish
    // "har bir buyurtma bekor bo'ladi" degan taassurot berardi.
    expect(FOOD_ORDER_FLOW).not.toContain('CANCELLED');
  });

  it('chiziq yetkazish bilan tugaydi', () => {
    expect(FOOD_ORDER_FLOW[FOOD_ORDER_FLOW.length - 1]).toBe('DELIVERED');
  });
});

describe('isCancellable', () => {
  /**
   * Chegara aynan shu yerda: oshxona tayyorlashni boshlaganidan keyin
   * mahsulot sarflangan bo'ladi va bekor qilish restoranga zarar
   * keltiradi.
   */
  it('faqat tayyorlash boshlanmagunicha ruxsat beradi', () => {
    expect(isCancellable('PENDING')).toBe(true);
    expect(isCancellable('CONFIRMED')).toBe(true);
    expect(isCancellable('PREPARING')).toBe(false);
    expect(isCancellable('DELIVERING')).toBe(false);
    expect(isCancellable('DELIVERED')).toBe(false);
    expect(isCancellable('CANCELLED')).toBe(false);
  });
});

describe('isFinalStatus', () => {
  it('yakuniy holatlarni ajratadi', () => {
    expect(isFinalStatus('DELIVERED')).toBe(true);
    expect(isFinalStatus('CANCELLED')).toBe(true);
    expect(isFinalStatus('DELIVERING')).toBe(false);
  });

  it("yakuniy holatni bekor qilib bo'lmaydi", () => {
    for (const status of ALL_STATUSES) {
      if (isFinalStatus(status)) expect(isCancellable(status)).toBe(false);
    }
  });
});

/**
 * Holatlar avtomati — bu bosqichning eng muhim qoidasi.
 *
 * Server, restoran kabineti va testlar AYNAN shu jadvaldan oziqlanadi.
 * Shuning uchun uni buzish darhol ko'rinishi kerak.
 */
describe('FOOD_ORDER_TRANSITIONS', () => {
  it("har bir holat uchun ro'yxat mavjud", () => {
    for (const status of ALL_STATUSES) {
      expect(Array.isArray(FOOD_ORDER_TRANSITIONS[status])).toBe(true);
    }
  });

  it("yakuniy holatlardan hech qayerga chiqib bo'lmaydi", () => {
    expect(FOOD_ORDER_TRANSITIONS.DELIVERED).toEqual([]);
    expect(FOOD_ORDER_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it("hech bir holat O'ZIGA o'ta olmaydi", () => {
    for (const status of ALL_STATUSES) {
      expect(FOOD_ORDER_TRANSITIONS[status]).not.toContain(status);
    }
  });

  /**
   * Eng jiddiy xato: buyurtma orqaga qaytishi. "Yetkazildi" dan
   * "Tayyorlanmoqda" ga qaytish mijoz uchun tushunarsiz va hisobotni
   * buzadi.
   */
  it('ORQAGA qaytish taqiqlangan', () => {
    for (const [from, targets] of Object.entries(FOOD_ORDER_TRANSITIONS)) {
      const fromIndex = FOOD_ORDER_FLOW.indexOf(from as FoodOrderStatusName);
      if (fromIndex === -1) continue;

      for (const to of targets) {
        if (to === 'CANCELLED') continue;

        const toIndex = FOOD_ORDER_FLOW.indexOf(to);
        expect(toIndex).toBeGreaterThan(fromIndex);
      }
    }
  });

  it("bosqichni SAKRAB o'tib bo'lmaydi", () => {
    for (const [from, targets] of Object.entries(FOOD_ORDER_TRANSITIONS)) {
      const fromIndex = FOOD_ORDER_FLOW.indexOf(from as FoodOrderStatusName);
      if (fromIndex === -1) continue;

      for (const to of targets) {
        if (to === 'CANCELLED') continue;

        expect(FOOD_ORDER_FLOW.indexOf(to)).toBe(fromIndex + 1);
      }
    }
  });
});

describe('canTransition', () => {
  it.each([
    ['PENDING', 'CONFIRMED', true],
    ['CONFIRMED', 'PREPARING', true],
    ['PREPARING', 'DELIVERING', true],
    ['DELIVERING', 'DELIVERED', true],
    ['CONFIRMED', 'CANCELLED', true],
    ['PENDING', 'CANCELLED', true],
  ] as const)('%s → %s = %s', (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
  });

  it.each([
    ['CONFIRMED', 'DELIVERED'],
    ['CONFIRMED', 'DELIVERING'],
    ['PENDING', 'PREPARING'],
    ['DELIVERED', 'PREPARING'],
    ['DELIVERED', 'CANCELLED'],
    ['CANCELLED', 'CONFIRMED'],
    ['DELIVERING', 'CANCELLED'],
  ] as const)('%s → %s rad etiladi', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  /**
   * Tayyorlash boshlanganidan keyin restoran rad eta olmaydi:
   * mahsulot sarflangan bo'ladi.
   */
  it("tayyorlash boshlangach rad etib bo'lmaydi", () => {
    expect(canRestaurantReject('CONFIRMED')).toBe(true);
    expect(canRestaurantReject('PREPARING')).toBe(false);
    expect(canRestaurantReject('DELIVERING')).toBe(false);
  });
});

describe('nextStatus', () => {
  it('keyingi mantiqiy qadamni beradi', () => {
    expect(nextStatus('PENDING')).toBe('CONFIRMED');
    expect(nextStatus('CONFIRMED')).toBe('PREPARING');
    expect(nextStatus('PREPARING')).toBe('DELIVERING');
    expect(nextStatus('DELIVERING')).toBe('DELIVERED');
  });

  it("yakuniy holatlarda keyingi qadam yo'q", () => {
    expect(nextStatus('DELIVERED')).toBeNull();
    expect(nextStatus('CANCELLED')).toBeNull();
  });

  it("keyingi qadam har doim RUXSAT ETILGAN o'tish", () => {
    for (const status of ALL_STATUSES) {
      const next = nextStatus(status);
      if (next) expect(canTransition(status, next)).toBe(true);
    }
  });

  it('har bir bosqich uchun tugma yozuvi bor', () => {
    for (const status of ALL_STATUSES) {
      const next = nextStatus(status);
      if (next) expect(FOOD_ORDER_ACTION_LABELS[status].length).toBeGreaterThan(0);
    }
  });
});
