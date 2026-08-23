import { describe, expect, it } from 'vitest';

import {
  CATALOG_IMAGE_OWNERS,
  IMAGE_ALT_MAX_LENGTH,
  MAX_CATALOG_IMAGES,
  OWNER_COLUMN,
  OWNER_LABEL,
  OWNER_SLUG,
  catalogImagesPath,
  fallbackAlt,
  nextSortOrder,
  ownerFromSlug,
  primaryImage,
} from '@/config/catalog-image';

/**
 * Katalog rasmlari — sozlama testlari.
 */

describe('turlar jadvali', () => {
  it("har bir turda ustun, nom va manzil BOR", () => {
    /**
     * Eng qimmat xato aynan shu yerda bo'lardi: yangi tur qo'shilib,
     * jadvallardan biriga yozish unutilsa, kod ishlab turaveradi va
     * faqat o'sha turdagi rasm yuklanmay qo'yadi.
     */
    for (const owner of CATALOG_IMAGE_OWNERS) {
      expect(OWNER_COLUMN[owner]).toBeTruthy();
      expect(OWNER_LABEL[owner]).toBeTruthy();
      expect(OWNER_SLUG[owner]).toBeTruthy();
    }
  });

  it('ustun nomlari TAKRORLANMAYDI', () => {
    const columns = CATALOG_IMAGE_OWNERS.map((owner) => OWNER_COLUMN[owner]);

    expect(new Set(columns).size).toBe(columns.length);
  });

  it('manzil nomlari TAKRORLANMAYDI', () => {
    const slugs = CATALOG_IMAGE_OWNERS.map((owner) => OWNER_SLUG[owner]);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("manzil nomi faqat kichik harf va tire", () => {
    for (const owner of CATALOG_IMAGE_OWNERS) {
      expect(OWNER_SLUG[owner]).toMatch(/^[a-z][a-z-]*[a-z]$/);
    }
  });
});

describe('manzildan turni topish', () => {
  it('har bir tur qaytib keladi', () => {
    for (const owner of CATALOG_IMAGE_OWNERS) {
      expect(ownerFromSlug(OWNER_SLUG[owner])).toBe(owner);
    }
  });

  it("noma'lum manzil `null`", () => {
    // Tasodifiy matn xato tashlamasligi kerak: bu 404 holati.
    expect(ownerFromSlug('shunday-narsa-yoq')).toBeNull();
    expect(ownerFromSlug('')).toBeNull();
  });

  it("KATTA harfli nom qabul qilinmaydi", () => {
    // Manzil aniq bir ko'rinishda bo'ladi, aks holda bir sahifa
    // ikki xil manzilda ochilardi.
    expect(ownerFromSlug('PRODUCT')).toBeNull();
  });

  it('manzil yasaladi', () => {
    expect(catalogImagesPath('MENU_ITEM', 'abc')).toBe('/api/v1/catalog/menu-item/abc/images');
  });
});

describe('tartib raqami', () => {
  it("birinchi rasm noldan boshlanadi", () => {
    expect(nextSortOrder([])).toBe(0);
  });

  it('yangi rasm OXIRIGA qo\'shiladi', () => {
    // Aks holda yangi rasm mavjudlarining o'rnini o'zgartirardi.
    expect(nextSortOrder([{ sortOrder: 0 }, { sortOrder: 1 }])).toBe(2);
  });

  it("tartib UZLUKLI bo'lsa ham ishlaydi", () => {
    /**
     * O'chirishdan keyin tartib raqamlari uzluk bilan qoladi
     * (0, 2, 5). Eng kattasidan keyingisi olinadi.
     */
    expect(nextSortOrder([{ sortOrder: 0 }, { sortOrder: 5 }])).toBe(6);
  });
});

describe('asosiy rasm', () => {
  it("eng kichik tartib raqamli rasm", () => {
    const images = [{ sortOrder: 2 }, { sortOrder: 0 }, { sortOrder: 1 }];

    expect(primaryImage(images)).toEqual({ sortOrder: 0 });
  });

  it("rasm bo'lmasa `null`", () => {
    expect(primaryImage([])).toBeNull();
  });

  it('ASL ro\'yxat o\'zgarmaydi', () => {
    // Saralash joyida bajarilsa, chaqiruvchining ro'yxati
    // bilinmasdan o'zgarib ketardi.
    const images = [{ sortOrder: 2 }, { sortOrder: 0 }];

    primaryImage(images);

    expect(images[0].sortOrder).toBe(2);
  });
});

describe('tavsif yasash', () => {
  it('birinchi rasmga NOMNING o\'zi', () => {
    expect(fallbackAlt('Telefon g\'ilofi', 0)).toBe("Telefon g'ilofi");
  });

  it('keyingilarga raqam qo\'shiladi', () => {
    expect(fallbackAlt('Telefon', 2)).toBe('Telefon — 3-rasm');
  });

  it("juda uzun nom KESILADI", () => {
    // Aks holda tavsif baza chegarasidan oshib ketardi.
    const result = fallbackAlt('a'.repeat(300), 0);

    expect(result.length).toBeLessThanOrEqual(IMAGE_ALT_MAX_LENGTH);
  });

  it("nom atrofidagi bo'shliq kesiladi", () => {
    expect(fallbackAlt('  Non  ', 0)).toBe('Non');
  });
});

describe('chegaralar', () => {
  it("rasm soni mantiqiy", () => {
    expect(MAX_CATALOG_IMAGES).toBeGreaterThan(1);
    expect(MAX_CATALOG_IMAGES).toBeLessThanOrEqual(12);
  });

  it("tavsif uzunligi ekranga sig'adi", () => {
    expect(IMAGE_ALT_MAX_LENGTH).toBeGreaterThan(20);
  });
});
