import { describe, expect, it } from 'vitest';

import { MAX_CATALOG_IMAGES } from '@/config/catalog-image';
import {
  addCatalogImageSchema,
  reorderCatalogImagesSchema,
} from '@/modules/catalog/catalog-image.schemas';

/**
 * Katalog rasmlari — validatsiya testlari.
 *
 * Bu yerdagi asosiy tekshiruv: BEGONA manzil qabul qilinmaydi.
 */

const OWN_URL = '/api/v1/files/catalog/user-1/abc.jpg';

describe("rasm qo'shish", () => {
  it("o'z manzilimiz qabul qilinadi", () => {
    expect(addCatalogImageSchema.safeParse({ url: OWN_URL }).success).toBe(true);
  });

  it('BEGONA sayt manzili RAD ETILADI', () => {
    /**
     * Eng muhim tekshiruv: begona manzil qabul qilinsa, katalogda
     * boshqa saytdagi rasm yuklanardi va uni istalgan payt
     * almashtirib yuborish mumkin bo'lardi.
     */
    const result = addCatalogImageSchema.safeParse({ url: 'https://boshqa-sayt.uz/rasm.jpg' });

    expect(result.success).toBe(false);
  });

  it("ma'lumot ichiga yashiringan manzil RAD ETILADI", () => {
    // `data:` manzili orqali sahifaga kod joylash urinishi.
    const result = addCatalogImageSchema.safeParse({
      url: 'data:text/html;base64,PHNjcmlwdD4=',
    });

    expect(result.success).toBe(false);
  });

  it("papkadan chiqish urinishi RAD ETILADI", () => {
    const result = addCatalogImageSchema.safeParse({ url: '/api/v1/files/../../.env' });

    expect(result.success).toBe(false);
  });

  it("bo'sh manzil RAD ETILADI", () => {
    expect(addCatalogImageSchema.safeParse({ url: '' }).success).toBe(false);
  });

  it('tavsif IXTIYORIY', () => {
    const result = addCatalogImageSchema.safeParse({ url: OWN_URL });

    expect(result.success).toBe(true);
    expect(result.success && result.data.alt).toBeUndefined();
  });

  it('juda uzun tavsif RAD ETILADI', () => {
    const result = addCatalogImageSchema.safeParse({ url: OWN_URL, alt: 'a'.repeat(500) });

    expect(result.success).toBe(false);
  });

  it("tavsif atrofidagi bo'shliq kesiladi", () => {
    const result = addCatalogImageSchema.safeParse({ url: OWN_URL, alt: '  Non  ' });

    expect(result.success && result.data.alt).toBe('Non');
  });
});

describe('tartiblash', () => {
  const id = () => crypto.randomUUID();

  it("to'g'ri ro'yxat qabul qilinadi", () => {
    expect(reorderCatalogImagesSchema.safeParse({ imageIds: [id(), id()] }).success).toBe(true);
  });

  it("bo'sh ro'yxat RAD ETILADI", () => {
    expect(reorderCatalogImagesSchema.safeParse({ imageIds: [] }).success).toBe(false);
  });

  it("ID bo'lmagan qiymat RAD ETILADI", () => {
    expect(reorderCatalogImagesSchema.safeParse({ imageIds: ['salom'] }).success).toBe(false);
  });

  it('CHEGARADAN uzun ro\'yxat RAD ETILADI', () => {
    /**
     * Bu yerda to'xtatilmasa, ming elementli ro'yxat bazaga
     * ming so'rov bo'lib ketardi.
     */
    const many = Array.from({ length: MAX_CATALOG_IMAGES + 1 }, id);

    expect(reorderCatalogImagesSchema.safeParse({ imageIds: many }).success).toBe(false);
  });
});
