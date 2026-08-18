import { describe, expect, it } from 'vitest';

import {
  COLLECTION_FILTER_ALL,
  COLLECTION_FILTER_NONE,
  COLLECTION_NAME_MAX_LENGTH,
  MAX_COLLECTIONS,
  cleanCollectionName,
  isValidCollectionName,
} from '@/config/collections';
import {
  createCollectionSchema,
  savedQuerySchema,
  setSaveCollectionSchema,
} from '@/modules/feed/collection.schemas';

describe('cleanCollectionName', () => {
  it("chekkadagi bo'shliqlarni olib tashlaydi", () => {
    expect(cleanCollectionName('  Retseptlar  ')).toBe('Retseptlar');
  });

  it("ichki bo'shliqlar BITTAGA aylanadi", () => {
    /*
      "Yangi    retseptlar" va "Yangi retseptlar" — odam uchun bir
      xil nom. Tozalanmasa, ro'yxatda ikkita bir xil ko'rinadigan
      tugma paydo bo'lardi.
    */
    expect(cleanCollectionName('Yangi    retseptlar')).toBe('Yangi retseptlar');
    expect(cleanCollectionName('Ish\n\tqidiruv')).toBe('Ish qidiruv');
  });

  it('chegaradan uzun nom kesiladi', () => {
    expect(cleanCollectionName('a'.repeat(100))).toHaveLength(COLLECTION_NAME_MAX_LENGTH);
  });
});

describe('isValidCollectionName', () => {
  it("oddiy nomni qabul qiladi", () => {
    expect(isValidCollectionName('Retseptlar')).toBe(true);
  });

  it("bo'sh va faqat bo'shliqdan iborat nomni RAD etadi", () => {
    /*
      Bo'sh nomli to'plam ro'yxatda kengligi nol bo'lgan tugma
      bo'lardi: uni ko'rish ham, bosish ham mumkin emasdi.
    */
    expect(isValidCollectionName('')).toBe(false);
    expect(isValidCollectionName('    ')).toBe(false);
    expect(isValidCollectionName('\n\t')).toBe(false);
  });

  it('juda uzun nom kesilgach ham QONUNIY bo\'ladi', () => {
    // Kesish chegarani ta'minlaydi — shuning uchun rad etilmaydi.
    expect(isValidCollectionName('a'.repeat(100))).toBe(true);
  });
});

describe('createCollectionSchema', () => {
  it('nomni tozalab qaytaradi', () => {
    const result = createCollectionSchema.safeParse({ name: '  Sotib   olaman ' });

    expect(result.success && result.data.name).toBe('Sotib olaman');
  });

  it("bo'sh nomni rad etadi", () => {
    expect(createCollectionSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('chegaradan uzun nom kesiladi, rad etilmaydi', () => {
    const result = createCollectionSchema.safeParse({ name: 'b'.repeat(60) });

    expect(result.success && result.data.name).toHaveLength(COLLECTION_NAME_MAX_LENGTH);
  });

  it('haddan tashqari uzun matn RAD etiladi', () => {
    /*
      Kesish chegarani ta'minlaydi, lekin megabaytlik satrni
      qabul qilib, keyin kesish — bekorga sarflangan xotira.
    */
    expect(createCollectionSchema.safeParse({ name: 'c'.repeat(1000) }).success).toBe(false);
  });
});

describe('setSaveCollectionSchema', () => {
  it("to'plam ID sini qabul qiladi", () => {
    const id = '3f1a6c2e-9b4d-4f8a-8c1e-2d7b5a9e0c34';

    expect(setSaveCollectionSchema.safeParse({ collectionId: id }).success).toBe(true);
  });

  it("`null` ham QONUNIY — postni to'plamdan chiqarish", () => {
    expect(setSaveCollectionSchema.safeParse({ collectionId: null }).success).toBe(true);
  });

  it('buzuq ID rad etiladi', () => {
    expect(setSaveCollectionSchema.safeParse({ collectionId: '../admin' }).success).toBe(false);
  });

  it("maydonning O'ZI majburiy", () => {
    /*
      Berilmasa, `undefined` kelardi va xizmat uni `null` deb
      qabul qilib, postni jimgina to'plamdan chiqarib yuborardi.
    */
    expect(setSaveCollectionSchema.safeParse({}).success).toBe(false);
  });
});

describe('savedQuerySchema', () => {
  it("filtrsiz so'rovda odatiy qiymat BARCHASI", () => {
    const result = savedQuerySchema.safeParse({});

    expect(result.success && result.data.collection).toBe(COLLECTION_FILTER_ALL);
  });

  it("guruhlanmaganlar filtri qabul qilinadi", () => {
    const result = savedQuerySchema.safeParse({ collection: COLLECTION_FILTER_NONE });

    expect(result.success && result.data.collection).toBe(COLLECTION_FILTER_NONE);
  });

  it("to'plam ID si qabul qilinadi", () => {
    const id = '3f1a6c2e-9b4d-4f8a-8c1e-2d7b5a9e0c34';
    const result = savedQuerySchema.safeParse({ collection: id });

    expect(result.success && result.data.collection).toBe(id);
  });

  it("noma'lum so'z rad etiladi", () => {
    /*
      Bunday qiymat o'tib ketsa, u to'plam ID si sifatida
      ishlatilib, ro'yxat doim bo'sh chiqardi.
    */
    expect(savedQuerySchema.safeParse({ collection: 'HAMMASI' }).success).toBe(false);
  });

  it("ro'yxat uzunligi chegaralangan", () => {
    expect(savedQuerySchema.safeParse({ limit: 100 }).success).toBe(false);
    expect(savedQuerySchema.safeParse({ limit: 30 }).success).toBe(true);
  });
});

describe('chegaralar', () => {
  it("to'plamlar soni cheklangan", () => {
    expect(MAX_COLLECTIONS).toBeGreaterThan(0);
    expect(MAX_COLLECTIONS).toBeLessThanOrEqual(50);
  });

  it("ikki filtr so'zi bir-biriga TENG EMAS", () => {
    /*
      Teng bo'lib qolsa, "guruhlanmagan" tugmasi butun ro'yxatni
      ochib yuborardi va buni payqash deyarli imkonsiz edi.
    */
    expect(COLLECTION_FILTER_ALL).not.toBe(COLLECTION_FILTER_NONE);
  });
});
