import { describe, expect, it } from 'vitest';

import {
  FOOD_ORDER_FLOW,
  FOOD_ORDER_STATUS_LABELS,
  FOOD_ORDER_STATUS_VARIANTS,
  isCancellable,
  isFinalStatus,
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
