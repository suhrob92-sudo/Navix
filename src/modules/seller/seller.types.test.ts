import { describe, expect, it } from 'vitest';

import {
  MARKET_ORDER_TRANSITIONS,
  canTransition,
  isCancellable,
  nextStatus,
  type MarketOrderStatusName,
} from '@/modules/market/market.types';
import { SELLER_ORDER_ACTION_LABELS, canShopReject } from '@/modules/seller/seller.types';

const ALL_STATUSES: MarketOrderStatusName[] = [
  'PENDING',
  'CONFIRMED',
  'PACKING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

/** Buyurtma hali tugamagan holatlar — sotuvchi shular bilan ishlaydi. */
const OPEN_STATUSES: MarketOrderStatusName[] = ['PENDING', 'CONFIRMED', 'PACKING', 'SHIPPED'];

describe('sotuvchi amal tugmalari', () => {
  it('har bir holat uchun qator bor', () => {
    for (const status of ALL_STATUSES) {
      expect(SELLER_ORDER_ACTION_LABELS[status]).toBeDefined();
    }
  });

  /**
   * Tugma yozuvi bo'sh bo'lsa, sotuvchi bo'sh tugmani bosadi.
   *
   * Shuning uchun qoida qat'iy: keyingi qadam BOR bo'lsa — yozuv ham
   * bo'lishi shart, keyingi qadam YO'Q bo'lsa — yozuv ham bo'lmasligi
   * kerak (aks holda ishlamaydigan tugma chiqadi).
   */
  it('yozuv keyingi qadam bilan mos keladi', () => {
    for (const status of ALL_STATUSES) {
      const hasNext = nextStatus(status) !== null;
      const hasLabel = SELLER_ORDER_ACTION_LABELS[status] !== '';

      expect(hasLabel).toBe(hasNext);
    }
  });
});

describe('do\'kon buyurtmani rad etishi', () => {
  /**
   * Rad etish — bu holatlar avtomatidagi `CANCELLED` o'tishning o'zi.
   *
   * Ikkita alohida ro'yxat saqlansa, ertaga jadval o'zgarganda tugma
   * qolib ketardi: sotuvchi bosadi, server esa rad etadi. Shuning uchun
   * test ikkalasini SOLISHTIRADI.
   */
  it('jadvaldagi ruxsat bilan bir xil', () => {
    for (const status of ALL_STATUSES) {
      expect(canShopReject(status)).toBe(canTransition(status, 'CANCELLED'));
    }
  });

  it("yo'lga chiqqan buyurtmani rad etib bo'lmaydi", () => {
    // Mahsulot kuryerda — uni javonga qaytarishning iloji yo'q.
    expect(canShopReject('SHIPPED')).toBe(false);
    expect(canShopReject('DELIVERED')).toBe(false);
  });

  it('xaridor bilan bir xil oynadan foydalanadi', () => {
    // Do'kon xaridordan ko'proq huquqqa ega bo'lmasligi kerak.
    for (const status of ALL_STATUSES) {
      expect(canShopReject(status)).toBe(isCancellable(status));
    }
  });
});

describe('holatlar avtomati sotuvchi uchun', () => {
  it('ochiq buyurtmada doim biror amal bor', () => {
    // Aks holda buyurtma "osilib" qoladi: na oldinga, na orqaga.
    for (const status of OPEN_STATUSES) {
      expect(MARKET_ORDER_TRANSITIONS[status].length).toBeGreaterThan(0);
    }
  });
});
