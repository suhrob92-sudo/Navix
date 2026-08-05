import { describe, expect, it } from 'vitest';

import {
  LOW_STOCK_THRESHOLD,
  MARKET_ORDER_FLOW,
  MARKET_ORDER_STATUS_LABELS,
  MARKET_ORDER_TRANSITIONS,
  canTransition,
  isCancellable,
  isFinalStatus,
  nextStatus,
  stockLabel,
  stockState,
  type MarketOrderStatusName,
} from '@/modules/market/market.types';

const ALL_STATUSES: MarketOrderStatusName[] = [
  'PENDING',
  'CONFIRMED',
  'PACKING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

describe('holatlar avtomati', () => {
  it('har bir holat uchun nom bor', () => {
    for (const status of ALL_STATUSES) {
      expect(MARKET_ORDER_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('har bir holat uchun jadval qatori bor', () => {
    for (const status of ALL_STATUSES) {
      expect(MARKET_ORDER_TRANSITIONS[status]).toBeDefined();
    }
  });

  it('buyurtma ORQAGA qaytmaydi', () => {
    // Har bir o'tish oldinga bo'lishi kerak — bekor qilishdan tashqari.
    for (const [from, targets] of Object.entries(MARKET_ORDER_TRANSITIONS)) {
      const fromIndex = MARKET_ORDER_FLOW.indexOf(from as MarketOrderStatusName);

      for (const to of targets) {
        if (to === 'CANCELLED') continue;

        expect(MARKET_ORDER_FLOW.indexOf(to)).toBeGreaterThan(fromIndex);
      }
    }
  });

  it('bosqichni SAKRAB o\'tib bo\'lmaydi', () => {
    expect(canTransition('PENDING', 'SHIPPED')).toBe(false);
    expect(canTransition('CONFIRMED', 'DELIVERED')).toBe(false);
    expect(canTransition('PENDING', 'CONFIRMED')).toBe(true);
  });

  it('yakuniy holatdan hech qayerga chiqib bo\'lmaydi', () => {
    expect(MARKET_ORDER_TRANSITIONS.DELIVERED).toHaveLength(0);
    expect(MARKET_ORDER_TRANSITIONS.CANCELLED).toHaveLength(0);
    expect(nextStatus('DELIVERED')).toBeNull();
    expect(nextStatus('CANCELLED')).toBeNull();
  });

  it('keyingi qadam ketma-ketlikka mos keladi', () => {
    expect(nextStatus('PENDING')).toBe('CONFIRMED');
    expect(nextStatus('CONFIRMED')).toBe('PACKING');
    expect(nextStatus('PACKING')).toBe('SHIPPED');
    expect(nextStatus('SHIPPED')).toBe('DELIVERED');
  });

  it('yakuniy holatlarni to\'g\'ri aniqlaydi', () => {
    expect(isFinalStatus('DELIVERED')).toBe(true);
    expect(isFinalStatus('CANCELLED')).toBe(true);
    expect(isFinalStatus('SHIPPED')).toBe(false);
  });
});

describe('bekor qilish oynasi', () => {
  /**
   * Bu ovqat modulidan ATAYLAB farq qiladi.
   *
   * Ovqatda "tayyorlanmoqda" bosqichida bekor qilib bo'lmaydi —
   * mahsulot sarflangan. Marketplace'da esa yig'ilayotgan mahsulot
   * hali omborda turadi va uni javonga qaytarish mumkin.
   */
  it("yo'lga chiqarilgunicha bekor qilinadi", () => {
    expect(isCancellable('PENDING')).toBe(true);
    expect(isCancellable('CONFIRMED')).toBe(true);
    expect(isCancellable('PACKING')).toBe(true);
  });

  it("yo'lga chiqqandan keyin bekor qilib bo'lmaydi", () => {
    expect(isCancellable('SHIPPED')).toBe(false);
    expect(isCancellable('DELIVERED')).toBe(false);
    expect(isCancellable('CANCELLED')).toBe(false);
  });
});

describe('zaxira holati', () => {
  it('tugagan mahsulotni aniqlaydi', () => {
    expect(stockState(0)).toBe('out');
    expect(stockLabel(0)).toBe('Tugadi');
  });

  it('oz qolganini aniqlaydi va SONINI aytadi', () => {
    // Aniq son muhim: "oz qoldi" degan noaniq gap foydalanuvchiga
    // nechta buyurtma berish mumkinligini aytmaydi.
    expect(stockState(1)).toBe('low');
    expect(stockState(LOW_STOCK_THRESHOLD)).toBe('low');
    expect(stockLabel(3)).toBe('3 ta qoldi');
  });

  it("yetarli bo'lsa aniq sonni ko'rsatmaydi", () => {
    // Omborda 400 ta borligini bilish xaridorga foyda bermaydi.
    expect(stockState(LOW_STOCK_THRESHOLD + 1)).toBe('ok');
    expect(stockLabel(400)).toBe('Mavjud');
  });

  it("manfiy zaxirani ham tugagan deb hisoblaydi", () => {
    // Bunday bo'lmasligi kerak, lekin hisobda xato bo'lsa —
    // "-2 ta qoldi" deb yozgandan ko'ra "Tugadi" degan xavfsizroq.
    expect(stockState(-2)).toBe('out');
    expect(stockLabel(-2)).toBe('Tugadi');
  });
});
