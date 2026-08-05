import { describe, expect, it } from 'vitest';

import {
  MAX_CART_LINES,
  MAX_ITEM_QUANTITY,
  cancelMarketOrderSchema,
  createMarketOrderSchema,
  productQuerySchema,
} from '@/modules/market/market.schemas';

const SHOP_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const PRODUCT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3302';
const ADDRESS_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3303';

function validOrder() {
  return {
    shopId: SHOP_ID,
    addressId: ADDRESS_ID,
    items: [{ productId: PRODUCT_ID, quantity: 2 }],
    idempotencyKey: 'market-order-0001',
  };
}

describe('createMarketOrderSchema', () => {
  it("to'g'ri buyurtmani qabul qiladi", () => {
    expect(createMarketOrderSchema.parse(validOrder()).items).toHaveLength(1);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * So'rovda narx bo'lmasligi kerak. Agar sxema uni qabul qilsa,
   * kimdir ertaga uni ishlatib qo'yishi va 4 million so'mlik telefon
   * 1 so'mga sotilishi mumkin.
   */
  it('NARXNI qabul qilmaydi', () => {
    const withPrice = { ...validOrder(), items: [{ productId: PRODUCT_ID, quantity: 1, price: 1 }] };

    const parsed = createMarketOrderSchema.parse(withPrice);

    expect(parsed.items[0]).not.toHaveProperty('price');
  });

  it("bo'sh savatni rad etadi", () => {
    expect(() => createMarketOrderSchema.parse({ ...validOrder(), items: [] })).toThrow();
  });

  it('juda katta sonni rad etadi', () => {
    expect(() =>
      createMarketOrderSchema.parse({
        ...validOrder(),
        items: [{ productId: PRODUCT_ID, quantity: MAX_ITEM_QUANTITY + 1 }],
      }),
    ).toThrow();
  });

  it('nol yoki manfiy sonni rad etadi', () => {
    for (const quantity of [0, -1]) {
      expect(() =>
        createMarketOrderSchema.parse({ ...validOrder(), items: [{ productId: PRODUCT_ID, quantity }] }),
      ).toThrow();
    }
  });

  it('kasr sonni rad etadi', () => {
    expect(() =>
      createMarketOrderSchema.parse({ ...validOrder(), items: [{ productId: PRODUCT_ID, quantity: 1.5 }] }),
    ).toThrow();
  });

  it("juda ko'p qatorni rad etadi", () => {
    const items = Array.from({ length: MAX_CART_LINES + 1 }, () => ({
      productId: PRODUCT_ID,
      quantity: 1,
    }));

    expect(() => createMarketOrderSchema.parse({ ...validOrder(), items })).toThrow();
  });

  it("noto'g'ri ID'ni rad etadi", () => {
    expect(() => createMarketOrderSchema.parse({ ...validOrder(), shopId: 'texnomart' })).toThrow();
  });

  it('idempotentlik kalitisiz o\'tkazmaydi', () => {
    const { idempotencyKey: _unused, ...withoutKey } = validOrder();

    expect(() => createMarketOrderSchema.parse(withoutKey)).toThrow();
  });

  it("kalitda begona belgilarni rad etadi", () => {
    expect(() =>
      createMarketOrderSchema.parse({ ...validOrder(), idempotencyKey: "kalit'; DROP TABLE--" }),
    ).toThrow();
  });
});

describe('cancelMarketOrderSchema', () => {
  it('sababsiz ham ishlaydi', () => {
    expect(cancelMarketOrderSchema.parse({})).toEqual({});
  });

  it('juda uzun sababni rad etadi', () => {
    expect(() => cancelMarketOrderSchema.parse({ reason: 'a'.repeat(256) })).toThrow();
  });
});

describe('productQuerySchema', () => {
  it("bo'sh so'rovda ommabop tartib qo'yiladi", () => {
    expect(productQuerySchema.parse({}).sort).toBe('popular');
  });

  it('narx chegaralarini sonda qabul qiladi', () => {
    // Manzil satridan matn keladi — sxema uni songa o'girishi kerak.
    const parsed = productQuerySchema.parse({ minPriceSom: '100000', maxPriceSom: '500000' });

    expect(parsed.minPriceSom).toBe(100_000);
    expect(parsed.maxPriceSom).toBe(500_000);
  });

  it('"inStock" ni mantiqiy qiymatga o\'giradi', () => {
    expect(productQuerySchema.parse({ inStock: 'true' }).inStock).toBe(true);
    expect(productQuerySchema.parse({ inStock: 'false' }).inStock).toBe(false);
    expect(productQuerySchema.parse({}).inStock).toBeUndefined();
  });

  it("noma'lum tartibni rad etadi", () => {
    expect(() => productQuerySchema.parse({ sort: 'random' })).toThrow();
  });
});
