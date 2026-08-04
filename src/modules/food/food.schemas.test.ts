import { describe, expect, it } from 'vitest';

import {
  MAX_CART_LINES,
  MAX_ITEM_QUANTITY,
  cancelFoodOrderSchema,
  cartLineSchema,
  createFoodOrderSchema,
  foodOrderQuerySchema,
  restaurantQuerySchema,
} from '@/modules/food/food.schemas';

const VALID_UUID = '3a9e5aad-e0ca-4098-b59f-9bb9ce83a625';
const OTHER_UUID = '7c2f1b90-4f5e-4d1a-9c3e-2b8a6d5e4f10';

const validOrder = {
  restaurantId: VALID_UUID,
  addressId: OTHER_UUID,
  items: [{ menuItemId: VALID_UUID, quantity: 2 }],
  idempotencyKey: 'food-abc12345',
};

describe('cartLineSchema', () => {
  it("to'g'ri qatorni qabul qiladi", () => {
    expect(cartLineSchema.safeParse({ menuItemId: VALID_UUID, quantity: 1 }).success).toBe(true);
  });

  it('nol yoki manfiy son rad etiladi', () => {
    expect(cartLineSchema.safeParse({ menuItemId: VALID_UUID, quantity: 0 }).success).toBe(false);
    expect(cartLineSchema.safeParse({ menuItemId: VALID_UUID, quantity: -3 }).success).toBe(false);
  });

  it('kasrli son rad etiladi', () => {
    expect(cartLineSchema.safeParse({ menuItemId: VALID_UUID, quantity: 1.5 }).success).toBe(false);
  });

  /**
   * Chegarasiz bo'lsa, bitta so'rovda 1 000 000 ta taom so'rash va
   * serverni hisoblashda ushlab turish mumkin edi.
   */
  it('juda katta son rad etiladi', () => {
    expect(cartLineSchema.safeParse({ menuItemId: VALID_UUID, quantity: MAX_ITEM_QUANTITY + 1 }).success).toBe(
      false,
    );
  });
});

describe('createFoodOrderSchema', () => {
  it("to'g'ri buyurtmani qabul qiladi", () => {
    expect(createFoodOrderSchema.safeParse(validOrder).success).toBe(true);
  });

  it("bo'sh savat rad etiladi", () => {
    expect(createFoodOrderSchema.safeParse({ ...validOrder, items: [] }).success).toBe(false);
  });

  it("juda ko'p xil taom rad etiladi", () => {
    const items = Array.from({ length: MAX_CART_LINES + 1 }, () => ({
      menuItemId: VALID_UUID,
      quantity: 1,
    }));

    expect(createFoodOrderSchema.safeParse({ ...validOrder, items }).success).toBe(false);
  });

  it('manzilsiz buyurtma rad etiladi', () => {
    const { addressId: _addressId, ...withoutAddress } = validOrder;

    expect(createFoodOrderSchema.safeParse(withoutAddress).success).toBe(false);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Sxemada narx maydoni umuman yo'q. Agar kimdir uni qo'shsa, bu test
   * yiqiladi va sabab darhol ko'rinadi: narx faqat serverda, bazadan
   * olinadi. Aks holda 55 000 so'mlik pitsani 1 so'mga "sotib olish"
   * mumkin bo'lardi.
   */
  it('mijoz yuborgan NARX qabul qilinmaydi', () => {
    const result = createFoodOrderSchema.safeParse({
      ...validOrder,
      items: [{ menuItemId: VALID_UUID, quantity: 1, price: 1 }],
      total: 1,
      deliveryFee: 0,
    });

    expect(result.success).toBe(true);

    // Zod noma'lum maydonlarni TASHLAB YUBORADI — ular natijaga tushmaydi.
    const parsed = result.success ? result.data : null;

    expect(parsed && 'total' in parsed).toBe(false);
    expect(parsed && 'deliveryFee' in parsed).toBe(false);
    expect(parsed?.items[0] && 'price' in parsed.items[0]).toBe(false);
  });

  it("idempotentlik kaliti majburiy va qisqa bo'lmasligi kerak", () => {
    const { idempotencyKey: _key, ...withoutKey } = validOrder;

    expect(createFoodOrderSchema.safeParse(withoutKey).success).toBe(false);
    expect(createFoodOrderSchema.safeParse({ ...validOrder, idempotencyKey: 'qisqa' }).success).toBe(false);
  });

  it("izoh ixtiyoriy, lekin uzun bo'lmasligi kerak", () => {
    expect(createFoodOrderSchema.safeParse({ ...validOrder, deliveryNote: 'domofon 45' }).success).toBe(true);
    expect(createFoodOrderSchema.safeParse({ ...validOrder, deliveryNote: 'a'.repeat(256) }).success).toBe(false);
  });
});

describe('cancelFoodOrderSchema', () => {
  it('sababsiz ham bekor qilish mumkin', () => {
    // Foydalanuvchi o'z buyurtmasini bekor qilyapti — sabab so'rash
    // ortiqcha to'siq bo'lardi. Admin qaytarishida esa u majburiy.
    expect(cancelFoodOrderSchema.safeParse({}).success).toBe(true);
  });

  it('sabab berilsa saqlanadi', () => {
    expect(cancelFoodOrderSchema.parse({ reason: "fikrim o'zgardi" }).reason).toBe("fikrim o'zgardi");
  });
});

describe("so'rov sxemalari", () => {
  it('restoran filtri ixtiyoriy', () => {
    expect(restaurantQuerySchema.parse({})).toEqual({});
    expect(restaurantQuerySchema.parse({ cuisine: 'Milliy' }).cuisine).toBe('Milliy');
  });

  it('buyurtma filtri standart qiymatga ega', () => {
    expect(foodOrderQuerySchema.parse({}).status).toBe('ALL');
  });

  it("noma'lum holat rad etiladi", () => {
    expect(foodOrderQuerySchema.safeParse({ status: 'SECRET' }).success).toBe(false);
  });
});
