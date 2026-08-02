import { describe, expect, it } from 'vitest';

import { createAddressSchema, formatAddressLine, updateAddressSchema } from '@/modules/address/address.schemas';

const validAddress = {
  type: 'HOME',
  label: 'Uyim',
  city: 'Toshkent',
  street: "Bunyodkor shoh ko'chasi",
  building: '12A',
  latitude: 41.2995,
  longitude: 69.2401,
};

describe('createAddressSchema', () => {
  it("to'g'ri manzilni qabul qiladi", () => {
    const result = createAddressSchema.safeParse(validAddress);

    expect(result.success).toBe(true);
    expect(result.data?.isDefault).toBe(false);
  });

  it("tur ko'rsatilmasa OTHER bo'ladi", () => {
    const { type: _type, ...withoutType } = validAddress;

    expect(createAddressSchema.parse(withoutType).type).toBe('OTHER');
  });

  it("matn ko'rinishidagi koordinatani songa aylantiradi", () => {
    const result = createAddressSchema.parse({ ...validAddress, latitude: '41.2995', longitude: '69.2401' });

    expect(result.latitude).toBe(41.2995);
    expect(typeof result.latitude).toBe('number');
  });

  describe('koordinatalar chegarasi', () => {
    it('chegaradan tashqaridagi kenglikni rad etadi', () => {
      expect(createAddressSchema.safeParse({ ...validAddress, latitude: 91 }).success).toBe(false);
      expect(createAddressSchema.safeParse({ ...validAddress, latitude: -91 }).success).toBe(false);
    });

    it('chegaradan tashqaridagi uzunlikni rad etadi', () => {
      expect(createAddressSchema.safeParse({ ...validAddress, longitude: 181 }).success).toBe(false);
      expect(createAddressSchema.safeParse({ ...validAddress, longitude: -181 }).success).toBe(false);
    });

    it('chegaradagi qiymatlarni qabul qiladi', () => {
      expect(createAddressSchema.safeParse({ ...validAddress, latitude: 90, longitude: 180 }).success).toBe(true);
    });

    it("raqam bo'lmagan qiymatni rad etadi", () => {
      expect(createAddressSchema.safeParse({ ...validAddress, latitude: 'shimol' }).success).toBe(false);
    });
  });

  it('qisqa nomni rad etadi', () => {
    expect(createAddressSchema.safeParse({ ...validAddress, label: 'U' }).success).toBe(false);
  });

  it("bo'sh ko'cha nomini rad etadi", () => {
    expect(createAddressSchema.safeParse({ ...validAddress, street: '' }).success).toBe(false);
  });

  it("noma'lum manzil turini rad etadi", () => {
    expect(createAddressSchema.safeParse({ ...validAddress, type: 'GARAJ' }).success).toBe(false);
  });

  it('juda uzun izohni rad etadi', () => {
    expect(createAddressSchema.safeParse({ ...validAddress, notes: 'a'.repeat(256) }).success).toBe(false);
  });
});

describe('updateAddressSchema', () => {
  it('bitta maydonni yangilashga ruxsat beradi', () => {
    expect(updateAddressSchema.safeParse({ label: 'Yangi nom' }).success).toBe(true);
  });

  it("bo'sh so'rovni rad etadi", () => {
    expect(updateAddressSchema.safeParse({}).success).toBe(false);
  });

  it('yangilashda ham koordinata chegarasi tekshiriladi', () => {
    expect(updateAddressSchema.safeParse({ latitude: 200 }).success).toBe(false);
  });
});

describe('formatAddressLine', () => {
  it("to'liq manzilni yig'adi", () => {
    const line = formatAddressLine({
      street: "Bunyodkor ko'chasi",
      building: '12A',
      apartment: '45',
      district: 'Chilonzor',
      city: 'Toshkent',
    });

    expect(line).toBe("Bunyodkor ko'chasi, 12A-uy, 45-xonadon, Chilonzor, Toshkent");
  });

  it("bo'sh maydonlarni o'tkazib yuboradi", () => {
    const line = formatAddressLine({
      street: "Amir Temur ko'chasi",
      building: null,
      apartment: null,
      district: null,
      city: 'Samarqand',
    });

    expect(line).toBe("Amir Temur ko'chasi, Samarqand");
  });

  it('faqat majburiy maydonlar bilan ishlaydi', () => {
    expect(formatAddressLine({ street: 'Navoiy', city: 'Buxoro' })).toBe('Navoiy, Buxoro');
  });
});
