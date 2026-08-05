import { describe, expect, it } from 'vitest';

import { assistantMessageSchema, assistantSlotsSchema } from '@/modules/assistant/assistant.schemas';
import type { AssistantSlots } from '@/modules/assistant/assistant.types';

/**
 * Bu testning sababi — haqiqiy xato.
 *
 * Ovqat suhbati qo'shilganda `AssistantSlots` ga uchta yangi maydon
 * qo'shildi, lekin API sxemasiga yozilmadi. Zod ro'yxatda yo'q
 * maydonlarni JIMGINA olib tashlaydi: server hech qanday xato
 * bermadi, testlar o'tdi, faqat brauzerda yordamchi tanlovni
 * "eslay olmadi".
 *
 * Quyidagi test buni qaytarilmasligini ta'minlaydi IKKI qavatda:
 *  1. `Required<AssistantSlots>` — turdan kelib chiqadi, ya'ni yangi
 *     maydon qo'shilsa TypeScript shu faylni yiqitadi;
 *  2. Zod natijasi solishtiriladi — maydon sxemada bo'lmasa yo'qoladi
 *     va test yiqiladi.
 */

/** Har bir maydon to'ldirilgan namuna. Turi majburlaydi. */
const FULL_SLOTS: Required<AssistantSlots> = {
  amountSom: 50_000,
  providerId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  providerName: 'Hududgaz',
  accountNumber: '1234567890',
  phone: '+998901234567',
  recipientName: 'Alisher Valiyev',
  foodOptions: [
    {
      menuItemId: '3f2504e0-4f89-41d3-9a0c-0305e82c3302',
      name: "Lag'mon",
      restaurantName: 'Milliy Taomlar',
      priceSom: 42_000,
    },
  ],
  menuItemId: '3f2504e0-4f89-41d3-9a0c-0305e82c3303',
  quantity: 2,
  productOptions: [
    {
      productId: '3f2504e0-4f89-41d3-9a0c-0305e82c3304',
      name: 'Samsung Galaxy A55 8/256GB',
      shopName: 'Texnomart',
      priceSom: 4_290_000,
    },
  ],
  productId: '3f2504e0-4f89-41d3-9a0c-0305e82c3305',
};

describe('assistantSlotsSchema', () => {
  it('holatning HAR BIR maydonini saqlab qoladi', () => {
    const parsed = assistantSlotsSchema.parse(FULL_SLOTS);

    // Maydon sxemada bo'lmasa Zod uni olib tashlaydi va bu yerda ko'rinadi.
    expect(Object.keys(parsed).sort()).toEqual(Object.keys(FULL_SLOTS).sort());
    expect(parsed).toEqual(FULL_SLOTS);
  });

  it("bo'sh holatni qabul qiladi", () => {
    expect(assistantSlotsSchema.parse({})).toEqual({});
  });

  it("noto'g'ri qiymatni rad etadi", () => {
    // Manfiy son ham, ID o'rniga oddiy matn ham o'tmasligi kerak.
    expect(() => assistantSlotsSchema.parse({ quantity: -1 })).toThrow();
    expect(() => assistantSlotsSchema.parse({ menuItemId: 'lagmon' })).toThrow();
  });

  it("variantlar ro'yxati cheksiz bo'lmaydi", () => {
    const many = Array.from({ length: 50 }, () => FULL_SLOTS.foodOptions[0]);

    expect(() => assistantSlotsSchema.parse({ foodOptions: many })).toThrow();
  });
});

describe('assistantMessageSchema', () => {
  it("bo'sh xabarni rad etadi", () => {
    expect(() => assistantMessageSchema.parse({ message: '   ' })).toThrow();
  });

  it('juda uzun xabarni rad etadi', () => {
    expect(() => assistantMessageSchema.parse({ message: 'a'.repeat(501) })).toThrow();
  });

  it("holatsiz xabar ham to'g'ri", () => {
    expect(assistantMessageSchema.parse({ message: 'balansim qancha' }).message).toBe('balansim qancha');
  });
});
